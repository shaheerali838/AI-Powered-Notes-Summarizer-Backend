// src/controllers/summarizeController.js
import { summarizeWithGemini } from "../services/summarizerService.js";
import { saveSummary } from "../services/historyServices.js";
import {
  formatResponse,
  formatErrorResponse,
} from "../utils/responseFormatter.js";

export const summarizeController = async (req, res) => {
  try {
    console.log("📝 Starting text summarization...");

    const { text } = req.body;

    // Validate input
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      console.error("❌ Invalid input: missing or empty text");
      return res
        .status(400)
        .json(
          formatErrorResponse(
            "Text content is required and cannot be empty",
            400
          )
        );
    }

    // Check text length (reasonable limits)
    const trimmedText = text.trim();
    if (trimmedText.length < 10) {
      return res
        .status(400)
        .json(
          formatErrorResponse(
            "Text is too short. Please provide at least 10 characters.",
            400
          )
        );
    }

    if (trimmedText.length > 50000) {
      // 50KB limit for text
      return res
        .status(400)
        .json(
          formatErrorResponse(
            "Text is too long. Please limit to 50,000 characters.",
            400
          )
        );
    }

    console.log(`📊 Processing text: ${trimmedText.length} characters`);

    // Generate summary using Gemini AI
    let summaryResult;
    try {
      summaryResult = await summarizeWithGemini(trimmedText);

      if (!summaryResult || !summaryResult.summary) {
        throw new Error("AI service returned invalid response");
      }

      console.log("✅ AI summarization completed");
    } catch (aiError) {
      console.error("❌ AI summarization failed:", aiError);

      let errorMessage = "Failed to generate AI summary. ";

      if (aiError.message.includes("API key")) {
        errorMessage += "AI service configuration error.";
      } else if (aiError.message.includes("quota")) {
        errorMessage += "AI service quota exceeded. Please try again later.";
      } else if (aiError.message.includes("too long")) {
        errorMessage += "Text is too long for processing.";
      } else {
        errorMessage += "Please try again.";
      }

      return res.status(500).json(
        formatErrorResponse(errorMessage, 500, {
          originalError: aiError.message,
          textLength: trimmedText.length,
        })
      );
    }

    const { summary, keyPoints } = summaryResult;

    // Save to history (non-blocking - don't fail the request if this fails)
    let historyId = null;
    try {
      const userId = req.user?.uid || null;

      const savedSummary = await saveSummary(
        trimmedText,
        summary,
        keyPoints,
        {
          source: "text_input",
          wordCount: trimmedText.split(/\s+/).filter((word) => word.length > 0)
            .length,
        },
        userId
      );

      historyId = savedSummary.id;
      console.log("✅ Summary saved to history");
    } catch (saveError) {
      console.error("⚠️ Failed to save to history (non-critical):", saveError);
      // Continue with response - history save failure shouldn't break the summarization
    }

    // Return successful response
    const response = {
      success: true,
      data: {
        id: historyId,
        original: trimmedText,
        summary,
        keyPoints,
        metadata: {
          originalLength: trimmedText.length,
          summaryLength: summary.length,
          keyPointsCount: keyPoints.length,
          wordCount: trimmedText.split(/\s+/).filter((word) => word.length > 0)
            .length,
          compressionRatio:
            (
              ((trimmedText.length - summary.length) / trimmedText.length) *
              100
            ).toFixed(1) + "%",
          processingTime: Date.now(),
        },
      },
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Text summarization completed successfully");
    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Summarize controller error:", error);

    res.status(500).json(
      formatErrorResponse(
        "An unexpected error occurred while processing your text",
        500,
        {
          textLength: req.body?.text?.length || 0,
        }
      )
    );
  }
};
