// src/routes/notes.js
import express from "express";
import {
  uploadFile,
  handleUploadError,
  validateUploadedFile,
  logUploadProgress,
} from "../middleware/uploadFile.js";
import {
  uploadFileController,
  getUploadStatus,
  notesHealthCheck,
} from "../controllers/notesController.js";

const router = express.Router();

/**
 * POST /api/notes/upload
 * Upload and process files (PDF, DOCX, Images)
 * Enhanced with comprehensive error handling and logging
 */
router.post(
  "/upload",
  // Log upload progress
  logUploadProgress,

  // Handle file upload with multer
  (req, res, next) => {
    uploadFile(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      next();
    });
  },

  // Validate uploaded file
  validateUploadedFile,

  // Process the file
  uploadFileController
);

/**
 * GET /api/notes/status/:uploadId
 * Get upload status (placeholder for future progress tracking)
 */
router.get("/status/:uploadId", getUploadStatus);

/**
 * GET /api/notes/health
 * Health check for notes service
 */
router.get("/health", notesHealthCheck);

/**
 * GET /api/notes/supported-formats
 * Get list of supported file formats
 */
router.get("/supported-formats", (req, res) => {
  res.status(200).json({
    success: true,
    supportedFormats: {
      documents: [
        {
          type: "PDF",
          extension: ".pdf",
          description: "Portable Document Format",
        },
        {
          type: "DOCX",
          extension: ".docx",
          description: "Microsoft Word Document",
        },
      ],
      images: [
        {
          type: "JPEG",
          extension: ".jpg, .jpeg",
          description: "JPEG Image (OCR)",
        },
        { type: "PNG", extension: ".png", description: "PNG Image (OCR)" },
        { type: "GIF", extension: ".gif", description: "GIF Image (OCR)" },
        { type: "BMP", extension: ".bmp", description: "Bitmap Image (OCR)" },
        { type: "TIFF", extension: ".tiff", description: "TIFF Image (OCR)" },
        { type: "WebP", extension: ".webp", description: "WebP Image (OCR)" },
      ],
    },
    limits: {
      maxFileSize: "10MB",
      maxFilesPerRequest: 1,
      supportedLanguages: ["English (OCR)"],
    },
    processing: {
      textExtraction: "Automatic based on file type",
      aiSummarization: "Google Gemini AI",
      historyStorage: "Firebase Firestore",
    },
  });
});

export default router;
