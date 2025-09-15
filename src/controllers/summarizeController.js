import { summarizeWithGemini } from "../services/summarizerService.js";
import { saveSummary } from "../services/historyServices.js";

export const summarizeController = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const { summary, keyPoints } = await summarizeWithGemini(text);

    // Save in Firebase Firestore
    const saved = await saveSummary(text, summary, keyPoints);

    res.json({
      id: saved.id,
      original: text,
      summary,
      keyPoints,
    });
  } catch (err) {
    console.error("❌ Controller Error:", err);
    res
      .status(500)
      .json({ error: "Failed to summarize", details: err.message });
  }
};
