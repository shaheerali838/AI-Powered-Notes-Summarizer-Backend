import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const toSummarize = "this is the dummy para";

const promptForRes = `You are a clear, simple, and precise note summarizer. Read the following text and create two outputs:

Simple Summary (Easy to Understand): Rewrite the main ideas in short, simple sentences or a small paragraph that anyone can easily understand. Avoid complex words and keep it very clear.

Key Points (Re-Summarized in Bullet Points): Extract the most important points from the text and list them as bullet points for quick revision. Keep each bullet short and meaningful.

Do not add extra information outside the text. Only simplify, clarify, and summarize what is provided.*

Text to summarize:
${toSummarize}`;
// const contentOfApi=(promptForRes,toSummarize)=>{}

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: promptForRes,
  });
  console.log(response.text);
}

main();
