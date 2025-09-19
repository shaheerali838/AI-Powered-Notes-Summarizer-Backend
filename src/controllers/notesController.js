import { extractTextFromFile, getFileTypeDescription } from "../services/fileProcessor.js";
import { summarizeWithGemini } from "../services/summarizerService.js";
import { saveSummary } from "../services/historyServices.js";
import { formatFileUploadResponse, formatErrorResponse } from "../utils/responseFormatter.js";

/**
 * Handle file upload and processing
 */
export const uploadFileController = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json(
        formatErrorResponse("No file uploaded", 400)
      );
    }

    const { originalname, mimetype, size } = req.file;
    
    console.log(`📁 Processing file: ${originalname} (${getFileTypeDescription(mimetype)}, ${(size / 1024 / 1024).toFixed(2)}MB)`);

    // Extract text from file
    let extractedText;
    try {
      extractedText = await extractTextFromFile(req.file);
      console.log(`✅ Text extracted: ${extractedText.length} characters`);
    } catch (extractionError) {
      console.error("❌ Text extraction failed:", extractionError);
      return res.status(422).json(
        formatErrorResponse(`Text extraction failed: ${extractionError.message}`, 422)
      );
    }

    // Summarize extracted text
    let summary, keyPoints;
    try {
      const summaryResult = await summarizeWithGemini(extractedText);
      summary = summaryResult.summary;
      keyPoints = summaryResult.keyPoints;
      console.log("✅ Text summarized successfully");
    } catch (summaryError) {
      console.error("❌ Summarization failed:", summaryError);
      return res.status(500).json(
        formatErrorResponse(`Summarization failed: ${summaryError.message}`, 500)
      );
    }

    // Save to history
    try {
      await saveSummary(extractedText, summary, keyPoints);
      console.log("✅ Summary saved to history");
    } catch (saveError) {
      console.error("⚠️ Failed to save to history:", saveError);
      // Don't fail the request if history save fails
    }

    // Return formatted response
    const response = formatFileUploadResponse(
      originalname,
      extractedText,
      summary,
      keyPoints
    );

    res.status(200).json(response);

  } catch (error) {
    console.error("❌ Upload controller error:", error);
    res.status(500).json(
      formatErrorResponse("Internal server error occurred", 500)
    );
  }
};