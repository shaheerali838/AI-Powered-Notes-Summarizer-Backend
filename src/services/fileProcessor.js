import pdf from "pdf-parse";
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";

/**
 * Extract text from PDF buffer
 */
export const extractTextFromPDF = async (buffer) => {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error("PDF extraction failed:", error);
    throw new Error("PDF extraction failed");
  }
};

/**
 * Extract text from DOCX buffer
 */
export const extractTextFromDOCX = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error("DOCX extraction failed:", error);
    throw new Error("DOCX extraction failed");
  }
};

/**
 * Extract text from image buffer using OCR
 */
export const extractTextFromImage = async (buffer) => {
  let worker;
  try {
    worker = await createWorker("eng");
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text.trim();
  } catch (error) {
    console.error("OCR extraction failed:", error);
    throw new Error("OCR extraction failed");
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
};

/**
 * Main text extraction function that routes to appropriate extractor
 */
export const extractTextFromFile = async (file) => {
  const { buffer, mimetype, originalname } = file;

  try {
    let extractedText = "";

    if (mimetype === "application/pdf") {
      extractedText = await extractTextFromPDF(buffer);
    } else if (
      mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      extractedText = await extractTextFromDOCX(buffer);
    } else if (mimetype.startsWith("image/")) {
      extractedText = await extractTextFromImage(buffer);
    } else {
      throw new Error("Unsupported file type");
    }

    // Clean up extracted text
    extractedText = extractedText.replace(/\s+/g, " ").trim();

    if (!extractedText || extractedText.length < 10) {
      throw new Error("No meaningful text could be extracted from the file");
    }

    return extractedText;
  } catch (error) {
    console.error(`Text extraction error for ${originalname}:`, error);
    throw error;
  }
};

/**
 * Get file type description for response
 */
export const getFileTypeDescription = (mimetype) => {
  if (mimetype === "application/pdf") return "PDF";
  if (
    mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "DOCX";
  if (mimetype.startsWith("image/")) return "Image";
  return "Unknown";
};
