import dotenv from "dotenv";

dotenv.config();

export const config = {
  geminiKey: process.env.GEMINI_API_KEY || "dummy_key_here",
};
