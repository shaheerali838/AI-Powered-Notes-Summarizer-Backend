// src/services/fileProcessor.js - Bulletproof version without problematic PDF libraries
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";

/**
 * Extract text from PDF using dynamic import to avoid startup issues
 * This version loads pdf-parse only when needed and handles errors gracefully
 */
export const extractTextFromPDF = async (buffer) => {
  try {
    console.log("🔄 Starting PDF text extraction...");

    // Try to dynamically import pdf-parse only when needed
    let pdfParse;
    try {
      pdfParse = await import("pdf-parse");
      console.log("✅ pdf-parse library loaded successfully");
    } catch (importError) {
      console.error("❌ Failed to load pdf-parse:", importError);
      throw new Error(
        "PDF processing is currently unavailable. Please try with a DOCX file or image instead."
      );
    }

    // Use the dynamically imported library
    const parseFunction = pdfParse.default || pdfParse;

    const data = await parseFunction(buffer, {
      max: 0, // Parse all pages
    });

    if (!data.text || data.text.trim().length < 10) {
      throw new Error(
        "No meaningful text could be extracted from PDF. The PDF may be image-based, password-protected, or corrupted."
      );
    }

    // Clean up the extracted text
    const cleanText = data.text
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\n\s*\n/g, "\n\n") // Clean up line breaks
      .trim();

    console.log(
      `✅ PDF extraction complete: ${cleanText.length} characters from ${
        data.numpages || "unknown"
      } pages`
    );
    return cleanText;
  } catch (error) {
    console.error("❌ PDF extraction failed:", error);

    // Provide specific error messages
    if (error.message.includes("Invalid PDF")) {
      throw new Error("Invalid PDF file format");
    } else if (error.message.includes("Password required")) {
      throw new Error("PDF is password protected");
    } else if (error.message.includes("unavailable")) {
      throw new Error(error.message); // Pass through our custom message
    } else {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }
};

/**
 * Alternative PDF text extraction using OCR as fallback
 * If PDF parsing fails, convert to image and use OCR
 */
const extractTextFromPDFWithOCR = async (buffer) => {
  try {
    console.log("🔄 Attempting PDF to image conversion for OCR...");

    // This is a fallback - in a real scenario, you'd convert PDF pages to images
    // For now, we'll return a helpful message
    throw new Error(
      "PDF text extraction failed. For image-based PDFs, please convert to image format (PNG/JPG) and upload again for OCR processing."
    );
  } catch (error) {
    console.error("❌ PDF OCR fallback failed:", error);
    throw error;
  }
};

/**
 * Extract text from DOCX buffer using Mammoth.js
 */
export const extractTextFromDOCX = async (buffer) => {
  try {
    console.log("🔄 Starting DOCX text extraction...");

    const result = await mammoth.extractRawText({
      buffer: buffer,
      options: {
        ignoreEmptyParagraphs: true,
      },
    });

    const extractedText = result.value.replace(/\s+/g, " ").trim();

    if (!extractedText || extractedText.length < 5) {
      throw new Error("No meaningful text found in DOCX file");
    }

    if (result.messages && result.messages.length > 0) {
      console.log("ℹ️ DOCX conversion messages:", result.messages);
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
 */
export const extractTextFromImage = async (buffer) => {
  let worker;
  try {
    console.log("🔄 Starting OCR text extraction...");

    worker = await createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`🔄 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    await worker.setParameters({
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()-[]{}\"'/\\@#$%^&*+=<>|~`",
      tessedit_pageseg_mode: "1",
      preserve_interword_spaces: "1",
    });

    const {
      data: { text, confidence },
    } = await worker.recognize(buffer);

    const cleanText = text
      .replace(/\n\s*\n/g, "\n")
      .replace(/\s+/g, " ")
      .trim();

    console.log(
      `✅ OCR complete: ${
        cleanText.length
      } characters, confidence: ${Math.round(confidence)}%`
    );

    if (!cleanText || cleanText.length < 5) {
      throw new Error(
        "No text could be recognized in the image. Please ensure the image contains clear, readable text."
      );
    }

    if (confidence < 30) {
      console.warn("⚠️ Low OCR confidence, text may be inaccurate");
    }

    return cleanText;
  } catch (error) {
    console.error("❌ OCR extraction failed:", error);
    throw new Error(`Image text extraction failed: ${error.message}`);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (terminateError) {
        console.error("⚠️ Worker termination error:", terminateError);
      }
    }
  }
};

/**
 * Main text extraction function - routes to appropriate extractor
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

    if (mimetype === "application/pdf") {
      try {
        extractedText = await extractTextFromPDF(buffer);
        fileTypeProcessed = "PDF";
      } catch (pdfError) {
        console.warn(
          "⚠️ PDF processing failed, suggesting alternatives:",
          pdfError.message
        );

        // For now, throw the error with helpful suggestions
        throw new Error(
          `PDF processing failed: ${pdfError.message}. ` +
            `Alternatives: 1) Convert PDF to DOCX format, 2) Take screenshots of PDF pages and upload as images for OCR processing, ` +
            `3) Copy and paste the text directly into the text input area.`
        );
      }
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
      throw new Error(
        `Unsupported file type: ${mimetype}. Supported formats: DOCX documents and images (JPEG, PNG, GIF, BMP, TIFF, WebP) for OCR.`
      );
    }

    if (!extractedText || typeof extractedText !== "string") {
      throw new Error("Text extraction returned invalid data");
    }

    const finalText = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s+$/gm, "")
      .trim();

    if (finalText.length < 10) {
      throw new Error(
        "Extracted text is too short to be meaningful. Please check if the file contains readable text."
      );
    }

    console.log(
      `✅ ${fileTypeProcessed} processing complete: ${finalText.length} characters extracted`
    );
    return finalText;
  } catch (error) {
    console.error(`❌ Text extraction failed for ${originalname}:`, error);

    // Return user-friendly error messages
    if (error.message.includes("PDF processing failed")) {
      throw new Error(error.message); // Pass through our detailed PDF error message
    } else if (error.message.includes("Password")) {
      throw new Error(`The file "${originalname}" is password protected.`);
    } else if (error.message.includes("No text could be recognized")) {
      throw new Error(
        `No readable text was found in the image "${originalname}". Please ensure the image contains clear, high-contrast text.`
      );
    } else if (error.message.includes("DOCX extraction failed")) {
      throw new Error(
        `The Word document "${originalname}" could not be processed. Please ensure it's a valid DOCX file.`
      );
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

  return typeMap[mimetype] || "Unknown File Type";
};

/**
 * Validate file before processing
 */
export const validateFileForProcessing = (file) => {
  const errors = [];
  const { mimetype, size, originalname } = file;

  const maxSize = 10 * 1024 * 1024;
  if (size > maxSize) {
    errors.push(
      `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds the 10MB limit`
    );
  }

  // Updated to reflect what actually works
  const allowedTypes = [
    "application/pdf", // Note: PDF support is limited due to technical constraints
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/webp",
  ];

  if (!allowedTypes.includes(mimetype)) {
    errors.push(
      `File type "${mimetype}" is not supported. Supported formats: DOCX documents and images (JPEG, PNG, GIF, BMP, TIFF, WebP).`
    );
  }

  if (!originalname || originalname.length > 255) {
    errors.push("Invalid filename");
  }

  return errors;
};

/**
 * Get supported file types for client reference
 */
export const getSupportedFileTypes = () => {
  return {
    fullySupported: [
      {
        type: "DOCX",
        mimetype:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        description: "Microsoft Word Documents",
      },
      {
        type: "JPEG",
        mimetype: "image/jpeg",
        description: "JPEG Images (OCR)",
      },
      { type: "PNG", mimetype: "image/png", description: "PNG Images (OCR)" },
      { type: "GIF", mimetype: "image/gif", description: "GIF Images (OCR)" },
      { type: "BMP", mimetype: "image/bmp", description: "BMP Images (OCR)" },
      {
        type: "TIFF",
        mimetype: "image/tiff",
        description: "TIFF Images (OCR)",
      },
      {
        type: "WebP",
        mimetype: "image/webp",
        description: "WebP Images (OCR)",
      },
    ],
    limitedSupport: [
      {
        type: "PDF",
        mimetype: "application/pdf",
        description:
          "PDF Documents (limited support due to technical constraints)",
      },
    ],
    alternatives: [
      "Convert PDF to DOCX using online tools",
      "Take screenshots of PDF pages and upload as images",
      "Copy and paste text directly from PDF into the text input area",
    ],
  };
};
