// src/services/fileProcessor.js - Final Vercel-compatible version
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";

/**
 * Extract text from PDF - Currently disabled to avoid ENOENT errors
 * Provides helpful error message with alternatives
 */
export const extractTextFromPDF = async (buffer) => {
  console.log("📄 PDF processing requested...");

  // For now, we disable PDF processing to avoid the ENOENT error
  // This can be re-enabled later with a different PDF processing solution

  throw new Error(
    "PDF processing is temporarily unavailable due to technical constraints in the serverless environment. " +
      "Please try one of these alternatives: " +
      "1) Convert your PDF to a DOCX file using online tools like SmallPDF or ILovePDF, " +
      "2) Take screenshots of your PDF pages and upload them as images for OCR processing, " +
      "3) Copy and paste the text directly from your PDF into the text input area."
  );
};

/**
 * Extract text from DOCX buffer using Mammoth.js
 * This is fully supported and works reliably
 */
export const extractTextFromDOCX = async (buffer) => {
  try {
    console.log("🔄 Starting DOCX text extraction...");

    const result = await mammoth.extractRawText({
      buffer: buffer,
      options: {
        ignoreEmptyParagraphs: true,
        convertImage: mammoth.images.ignore, // Ignore images for text extraction
      },
    });

    const extractedText = result.value.replace(/\s+/g, " ").trim();

    if (!extractedText || extractedText.length < 5) {
      throw new Error(
        "No meaningful text found in DOCX file. The document may be empty or contain only images."
      );
    }

    // Log conversion messages if any
    if (result.messages && result.messages.length > 0) {
      console.log("ℹ️ DOCX conversion messages:", result.messages.slice(0, 3)); // Limit log spam
    }

    console.log(
      `✅ DOCX extraction complete: ${extractedText.length} characters`
    );
    return extractedText;
  } catch (error) {
    console.error("❌ DOCX extraction failed:", error);
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
};

/**
 * Extract text from image buffer using Tesseract.js OCR
 * This is fully supported and works reliably
 */
export const extractTextFromImage = async (buffer) => {
  let worker;
  try {
    console.log("🔄 Starting OCR text extraction...");

    // Create worker with English language
    worker = await createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`🔄 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    // Configure OCR parameters for better accuracy
    await worker.setParameters({
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()-[]{}\"'/\\@#$%^&*+=<>|~`",
      tessedit_pageseg_mode: "1", // Automatic page segmentation with OSD
      preserve_interword_spaces: "1",
    });

    // Perform OCR recognition
    const {
      data: { text, confidence },
    } = await worker.recognize(buffer);

    // Clean up the extracted text
    const cleanText = text
      .replace(/\n\s*\n/g, "\n") // Clean up excessive line breaks
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    console.log(
      `✅ OCR complete: ${
        cleanText.length
      } characters, confidence: ${Math.round(confidence)}%`
    );

    // Validate extracted text
    if (!cleanText || cleanText.length < 5) {
      throw new Error(
        "No text could be recognized in the image. Please ensure the image contains clear, readable text with good contrast."
      );
    }

    // Warn about low confidence
    if (confidence < 30) {
      console.warn(
        "⚠️ Low OCR confidence detected. Text accuracy may be reduced."
      );
    }

    return cleanText;
  } catch (error) {
    console.error("❌ OCR extraction failed:", error);

    // Provide helpful error messages
    if (error.message.includes("recognize")) {
      throw new Error(
        "OCR processing failed. Please ensure the image is clear and contains readable text."
      );
    } else if (error.message.includes("worker")) {
      throw new Error("OCR service initialization failed. Please try again.");
    } else {
      throw new Error(`Image text extraction failed: ${error.message}`);
    }
  } finally {
    // Always clean up the worker
    if (worker) {
      try {
        await worker.terminate();
        console.log("🧹 OCR worker cleaned up successfully");
      } catch (terminateError) {
        console.error("⚠️ OCR worker cleanup error:", terminateError);
      }
    }
  }
};

/**
 * Main text extraction function - routes to appropriate extractor
 * Enhanced with better error handling and user guidance
 */
export const extractTextFromFile = async (file) => {
  const { buffer, mimetype, originalname, size } = file;

  console.log(
    `📁 Processing file: ${originalname} (${mimetype}, ${(
      size /
      1024 /
      1024
    ).toFixed(2)}MB)`
  );

  try {
    let extractedText = "";
    let fileTypeProcessed = "";

    // Route to appropriate extraction method based on MIME type
    if (mimetype === "application/pdf") {
      extractedText = await extractTextFromPDF(buffer);
      fileTypeProcessed = "PDF";
    } else if (
      mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      extractedText = await extractTextFromDOCX(buffer);
      fileTypeProcessed = "DOCX";
    } else if (mimetype.startsWith("image/")) {
      extractedText = await extractTextFromImage(buffer);
      fileTypeProcessed = "Image (OCR)";
    } else {
      const supportedTypes = [
        "DOCX (Word Documents)",
        "JPEG/PNG/GIF/BMP/TIFF/WebP (Images for OCR)",
      ];
      throw new Error(
        `Unsupported file type: ${mimetype}. ` +
          `Currently supported formats: ${supportedTypes.join(", ")}.`
      );
    }

    // Validate extracted text
    if (!extractedText || typeof extractedText !== "string") {
      throw new Error(
        "Text extraction returned invalid data. Please try a different file."
      );
    }

    // Clean up the final text
    const finalText = extractedText
      .replace(/\r\n/g, "\n") // Normalize Windows line endings
      .replace(/\r/g, "\n") // Normalize old Mac line endings
      .replace(/\n{3,}/g, "\n\n") // Limit consecutive line breaks
      .replace(/\s+$/gm, "") // Remove trailing spaces from each line
      .trim(); // Remove leading/trailing whitespace

    // Final validation
    if (finalText.length < 10) {
      throw new Error(
        "The extracted text is too short to be meaningful. " +
          "Please ensure your file contains sufficient readable text content."
      );
    }

    console.log(
      `✅ ${fileTypeProcessed} processing complete: ${finalText.length} characters extracted`
    );
    return finalText;
  } catch (error) {
    console.error(`❌ Text extraction failed for ${originalname}:`, error);

    // Provide user-friendly error messages with specific guidance
    if (error.message.includes("PDF processing is temporarily unavailable")) {
      throw new Error(error.message); // Pass through our detailed PDF message
    } else if (error.message.includes("password protected")) {
      throw new Error(
        `The file "${originalname}" is password protected. Please remove the password and try again.`
      );
    } else if (error.message.includes("No text could be recognized")) {
      throw new Error(
        `No readable text was found in the image "${originalname}". ` +
          `Please ensure the image contains clear, high-contrast text and try again.`
      );
    } else if (error.message.includes("DOCX extraction failed")) {
      throw new Error(
        `The Word document "${originalname}" could not be processed. ` +
          `Please ensure it's a valid DOCX file and not corrupted.`
      );
    } else if (error.message.includes("Unsupported file type")) {
      throw new Error(error.message); // Pass through our detailed file type message
    } else {
      throw new Error(
        `Failed to extract text from "${originalname}": ${error.message}`
      );
    }
  }
};

/**
 * Get human-readable file type description
 */
export const getFileTypeDescription = (mimetype) => {
  const typeMap = {
    "application/pdf": "PDF Document (Limited Support)",
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

  return typeMap[mimetype] || "Unknown File Type";
};

/**
 * Validate file before processing
 * Enhanced with current limitations
 */
export const validateFileForProcessing = (file) => {
  const errors = [];
  const { mimetype, size, originalname } = file;

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (size > maxSize) {
    errors.push(
      `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds the 10MB limit`
    );
  }

  // Currently supported types (PDF temporarily disabled)
  const fullySupported = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/webp", // Images
  ];

  const limitedSupport = [
    "application/pdf", // PDF - will show helpful error message
  ];

  const allAllowed = [...fullySupported, ...limitedSupport];

  if (!allAllowed.includes(mimetype)) {
    errors.push(
      `File type "${mimetype}" is not supported. ` +
        `Fully supported: DOCX documents and images (JPEG, PNG, GIF, BMP, TIFF, WebP) for OCR. ` +
        `Limited support: PDF (with suggested alternatives).`
    );
  }

  // Basic filename validation
  if (!originalname || originalname.length > 255) {
    errors.push("Invalid filename - filename is missing or too long");
  }

  // Check for potentially dangerous filenames
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (originalname && dangerousChars.test(originalname)) {
    errors.push("Invalid filename - contains unsafe characters");
  }

  return errors;
};

/**
 * Get current service capabilities
 */
export const getServiceCapabilities = () => {
  return {
    fullySupported: {
      DOCX: {
        mimetype:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        description: "Microsoft Word Documents - Full text extraction",
        reliability: "High",
      },
      Images: {
        mimetypes: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/bmp",
          "image/tiff",
          "image/webp",
        ],
        description: "Image files with OCR text recognition",
        reliability: "High (depends on image quality)",
      },
    },
    limitedSupport: {
      PDF: {
        mimetype: "application/pdf",
        description:
          "PDF Documents - Currently limited due to technical constraints",
        reliability: "Temporarily unavailable",
        alternatives: [
          "Convert PDF to DOCX format",
          "Take screenshots and upload as images",
          "Copy and paste text directly",
        ],
      },
    },
    limitations: {
      maxFileSize: "10MB",
      supportedLanguages: ["English (OCR)"],
      note: "PDF support is temporarily limited in the serverless environment",
    },
  };
};
