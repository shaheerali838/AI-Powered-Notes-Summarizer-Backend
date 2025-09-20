// src/middleware/uploadFile.js
import multer from "multer";

// Configure storage to use memory storage for serverless compatibility
const storage = multer.memoryStorage();

// Enhanced file filter with detailed validation
const fileFilter = (req, file, cb) => {
  console.log(`🔍 Validating file: ${file.originalname} (${file.mimetype})`);

  // Define allowed MIME types with their descriptions
  const allowedTypes = {
    "application/pdf": "PDF Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "Word Document (DOCX)",
    "image/jpeg": "JPEG Image",
    "image/jpg": "JPEG Image",
    "image/png": "PNG Image",
    "image/gif": "GIF Image",
    "image/bmp": "BMP Image",
    "image/tiff": "TIFF Image",
    "image/webp": "WebP Image",
  };

  // Check if MIME type is allowed
  if (!allowedTypes[file.mimetype]) {
    const supportedFormats = Object.values(allowedTypes).join(", ");
    const error = new Error(
      `Invalid file type: ${file.mimetype}. Supported formats: ${supportedFormats}`
    );
    error.code = "INVALID_FILE_TYPE";
    console.log(`❌ File validation failed: ${error.message}`);
    return cb(error, false);
  }

  // Additional filename validation
  if (!file.originalname || file.originalname.length > 255) {
    const error = new Error(
      "Invalid filename: filename is missing or too long"
    );
    error.code = "INVALID_FILENAME";
    console.log(`❌ Filename validation failed: ${error.message}`);
    return cb(error, false);
  }

  // Check for potentially dangerous filenames
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.originalname)) {
    const error = new Error("Invalid filename: contains unsafe characters");
    error.code = "UNSAFE_FILENAME";
    console.log(`❌ Unsafe filename detected: ${file.originalname}`);
    return cb(error, false);
  }

  console.log(`✅ File validation passed: ${file.originalname}`);
  cb(null, true);
};

// Configure multer with enhanced settings
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files at once
    fields: 10, // Maximum 10 form fields
    parts: 15, // Maximum 15 multipart parts
  },
  // Preserve original filename and prevent issues
  preservePath: false,
});

// Comprehensive error handling middleware
export const handleUploadError = (error, req, res, next) => {
  console.error("📤 Upload error occurred:", error);

  // Handle Multer-specific errors
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          error: "File size too large. Maximum allowed size is 10MB.",
          errorCode: "FILE_TOO_LARGE",
          details: {
            maxSize: "10MB",
            receivedSize: req.file
              ? `${(req.file.size / 1024 / 1024).toFixed(2)}MB`
              : "Unknown",
          },
        });

      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          error: "Too many files uploaded. Maximum is 5 files at once.",
          errorCode: "TOO_MANY_FILES",
          details: {
            maxFiles: 5,
          },
        });

      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field. Please use the "file" field name.',
          errorCode: "UNEXPECTED_FILE_FIELD",
          details: {
            expectedField: "file",
          },
        });

      case "LIMIT_PART_COUNT":
        return res.status(400).json({
          success: false,
          error: "Too many form parts in the request.",
          errorCode: "TOO_MANY_PARTS",
        });

      case "LIMIT_FIELD_COUNT":
        return res.status(400).json({
          success: false,
          error: "Too many form fields in the request.",
          errorCode: "TOO_MANY_FIELDS",
        });

      default:
        return res.status(400).json({
          success: false,
          error: `Upload error: ${error.message}`,
          errorCode: "MULTER_ERROR",
        });
    }
  }

  // Handle custom file validation errors
  if (error.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({
      success: false,
      error: error.message,
      errorCode: "INVALID_FILE_TYPE",
      details: {
        supportedFormats: "PDF, DOCX, JPEG, PNG, GIF, BMP, TIFF, WebP",
      },
    });
  }

  if (error.code === "INVALID_FILENAME" || error.code === "UNSAFE_FILENAME") {
    return res.status(400).json({
      success: false,
      error: error.message,
      errorCode: error.code,
    });
  }

  // Handle other errors
  console.error("❌ Unexpected upload error:", error);
  return res.status(500).json({
    success: false,
    error: "File upload failed due to server error. Please try again.",
    errorCode: "UPLOAD_SERVER_ERROR",
  });
};

// Main upload middleware - single file upload
export const uploadFile = upload.single("file");

// Multiple files upload middleware (for future use)
export const uploadMultipleFiles = upload.array("files", 5);

// Upload validation middleware (to be used after multer)
export const validateUploadedFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded. Please select a file to upload.",
      errorCode: "NO_FILE_UPLOADED",
    });
  }

  // Additional server-side validation
  const { mimetype, size, originalname, buffer } = req.file;

  // Verify buffer exists and has content
  if (!buffer || buffer.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Uploaded file is empty or corrupted.",
      errorCode: "EMPTY_FILE",
    });
  }

  // Log file info for debugging
  console.log(
    `✅ File upload validated: ${originalname} (${mimetype}, ${(
      size /
      1024 /
      1024
    ).toFixed(2)}MB)`
  );

  // Add file metadata to request for later use
  req.fileMetadata = {
    filename: originalname,
    mimetype,
    size,
    sizeFormatted: `${(size / 1024 / 1024).toFixed(2)}MB`,
    uploadedAt: new Date().toISOString(),
  };

  next();
};

// Middleware to log upload progress (for debugging)
export const logUploadProgress = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const filename = req.file?.originalname || "No file";

    console.log(
      `📊 Upload completed: ${filename} | Status: ${status} | Duration: ${duration}ms`
    );
  });

  next();
};
