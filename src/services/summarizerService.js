import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function summarizeWithGemini(text) {
  try {
    const prompt = `
You are a professional note summarizer. Convert any text into clear, concise, and highly professional study notes. Follow these rules exactly:

1. Produce a Summary paragraph:
   - Start directly with the word "Summary" on its own line.
   - Write the main ideas clearly and professionally.
   - Keep sentences concise and easy to understand.
   - Do not include extra symbols, markdown characters, or unnecessary headings.
   - Do not use bold, italics, asterisks, bullets, or hashes anywhere.

2. Produce Key Points in a numbered, hierarchical format:
   - Start directly with the word "Key Points" on its own line.
   - Use numbers for main points (1., 2., 3., ...).
   - For sub-points, use nested numbering (1.1, 1.2, 1.2.1, 1.2.2, ...) to indicate hierarchy.
   - Indent each level of sub-points by two spaces per level.
   - Each point must be short, meaningful, and directly from the text.
   - Do not use bold, italics, asterisks, bullets, or hashes anywhere.

3. Do not add any introductory text like "Here are the summaries" or "Based on your text".

Text to summarize:  
${text}
`;

    // ✅ Use correct API call
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    // ✅ Split into summary & key points
    const [summaryPart, keyPointsPart] = rawText.split("Key Points");

    const summary = summaryPart?.replace("Summary", "").trim() || "No summary";
    const keyPoints = keyPointsPart
      ? keyPointsPart
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      : [];

    return {
      original: text,
      summary,
      keyPoints,
    };
  } catch (error) {
    console.error("❌ SummarizerService Error:", error);
    throw error;
  }
}
