// src/controllers/notesController.js
import {
  extractTextFromFile,
  getFileTypeDescription,
  validateFileForProcessing,
} from "../services/fileProcessor.js";
import { summarizeWithGemini } from "../services/summarizerService.js";
import { saveSummary } from "../services/historyServices.js";
import {
  formatFileUploadResponse,
  formatErrorResponse,
} from "../utils/responseFormatter.js";

/**
 * Enhanced file upload controller with comprehensive error handling
 * Fixes: All previous upload issues, provides detailed error messages
 */
export const uploadFileController = async (req, res) => {
  const startTime = Date.now();

  try {
    console.log("🚀 Starting file upload processing...");

    // Validate file presence (should be caught by middleware, but double-check)
    if (!req.file) {
      console.error("❌ No file found in request");
      return res
        .status(400)
        .json(
          formatErrorResponse(
            "No file uploaded. Please select a file to process.",
            400
          )
        );
    }

    const { originalname, mimetype, size, buffer } = req.file;

    console.log(`📁 Processing file: ${originalname}`);
    console.log(
      `📊 File details: ${getFileTypeDescription(mimetype)}, ${(
        size /
        1024 /
        1024
      ).toFixed(2)}MB`
    );

    // Server-side file validation (additional safety check)
    const validationErrors = validateFileForProcessing(req.file);
    if (validationErrors.length > 0) {
      console.error("❌ File validation failed:", validationErrors);
      return res
        .status(400)
        .json(
          formatErrorResponse(
            `File validation failed: ${validationErrors.join(", ")}`,
            400
          )
        );
    }

    // Extract text from file with detailed error handling
    let extractedText;
    try {
      console.log("🔄 Starting text extraction...");
      extractedText = await extractTextFromFile(req.file);

      if (!extractedText || typeof extractedText !== "string") {
        throw new Error("Text extraction returned invalid data");
      }

      console.log(
        `✅ Text extraction successful: ${extractedText.length} characters`
      );
    } catch (extractionError) {
      console.error("❌ Text extraction failed:", extractionError);

      // Provide specific error messages based on error type
      let userMessage = "Failed to extract text from the uploaded file.";

      if (extractionError.message.includes("Invalid PDF")) {
        userMessage =
          "The PDF file appears to be corrupted or invalid. Please try uploading a different PDF file.";
      } else if (extractionError.message.includes("password protected")) {
        userMessage =
          "The PDF file is password protected. Please remove the password and try again.";
      } else if (
        extractionError.message.includes("No text could be recognized")
      ) {
        userMessage =
          "No readable text was found in the image. Please ensure the image contains clear, readable text.";
      } else if (extractionError.message.includes("DOCX extraction failed")) {
        userMessage =
          "The Word document could not be processed. Please ensure it's a valid DOCX file.";
      } else if (extractionError.message.includes("too short")) {
        userMessage =
          "The file doesn't contain enough readable text to process. Please upload a file with more content.";
      }

      return res.status(422).json(
        formatErrorResponse(userMessage, 422, {
          originalError: extractionError.message,
          filename: originalname,
          fileType: getFileTypeDescription(mimetype),
        })
      );
    }

    // Summarize extracted text using Gemini AI
    let summary, keyPoints;
    try {
      console.log("🔄 Starting AI summarization...");

      const summaryResult = await summarizeWithGemini(extractedText);

      if (!summaryResult || !summaryResult.summary) {
        throw new Error("AI summarization returned invalid results");
      }

      summary = summaryResult.summary;
      keyPoints = summaryResult.keyPoints || [];

      console.log("✅ AI summarization successful");
      console.log(`📝 Summary length: ${summary.length} characters`);
      console.log(`🔑 Key points: ${keyPoints.length} items`);
    } catch (summaryError) {
      console.error("❌ AI summarization failed:", summaryError);

      // Provide user-friendly error message for AI failures
      let userMessage = "Failed to generate AI summary. ";

      if (summaryError.message.includes("API key")) {
        userMessage +=
          "AI service configuration error. Please try again later.";
      } else if (summaryError.message.includes("quota")) {
        userMessage += "AI service quota exceeded. Please try again later.";
      } else if (summaryError.message.includes("too long")) {
        userMessage +=
          "The text is too long to process. Please try with a shorter document.";
      } else {
        userMessage +=
          "Please try again or contact support if the issue persists.";
      }

      return res.status(500).json(
        formatErrorResponse(userMessage, 500, {
          originalError: summaryError.message,
          textLength: extractedText.length,
          filename: originalname,
        })
      );
    }

    // Save to history (non-blocking - don't fail the request if this fails)
    try {
      console.log("🔄 Saving to history...");

      await saveSummary(extractedText, summary, keyPoints, {
        filename: originalname,
        fileType: mimetype,
        fileSize: size,
      });

      console.log("✅ Successfully saved to history");
    } catch (saveError) {
      console.error("⚠️ Failed to save to history (non-critical):", saveError);
      // Continue with response - history save failure shouldn't break the upload
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;
    console.log(`⚡ Total processing time: ${processingTime}ms`);

    // Return successful response with all data
    const response = formatFileUploadResponse(
      originalname,
      extractedText,
      summary,
      keyPoints,
      {
        fileType: getFileTypeDescription(mimetype),
        fileSize: size,
        processingTime: processingTime,
        extractedLength: extractedText.length,
        summaryLength: summary.length,
        keyPointsCount: keyPoints.length,
      }
    );

    console.log("✅ File upload processing completed successfully");
    return res.status(200).json(response);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Unexpected error in upload controller:", error);
    console.error("📊 Processing failed after:", processingTime, "ms");

    // Log full error details for debugging
    console.error("Error stack:", error.stack);

    // Return generic server error to user
    return res.status(500).json(
      formatErrorResponse(
        "An unexpected server error occurred while processing your file. Please try again.",
        500,
        {
          processingTime: processingTime,
          filename: req.file?.originalname || "unknown",
        }
      )
    );
  }
};

/**
 * Get upload status/progress (for potential future use)
 */
export const getUploadStatus = async (req, res) => {
  try {
    const { uploadId } = req.params;

    // This is a placeholder for future upload progress tracking
    res.status(200).json({
      success: true,
      uploadId,
      status: "completed",
      message:
        "Upload status endpoint - to be implemented for progress tracking",
    });
  } catch (error) {
    console.error("Error getting upload status:", error);
    res
      .status(500)
      .json(formatErrorResponse("Failed to get upload status", 500));
  }
};

/**
 * Health check for the notes controller
 */
export const notesHealthCheck = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Notes controller is healthy",
      timestamp: new Date().toISOString(),
      services: {
        fileProcessor: "active",
        aiSummarizer: "active",
        historyService: "active",
      },
    });
  } catch (error) {
    res
      .status(500)
      .json(formatErrorResponse("Notes controller health check failed", 500));
  }
};
