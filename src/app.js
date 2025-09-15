import express from "express";
import dotenv from "dotenv";
import summarizeRoutes from "./routes/summarize.js";
import historyRoutes from "./routes/history.js"; // ✅ import history routes
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ Enable CORS for frontend (Vite default port 5173)
app.use(
  cors({
    origin: "https://ai-powered-notes-summarizer.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Routes
app.use("/api/summarize", summarizeRoutes);
app.use("/api/history", historyRoutes); // ✅ history route

// Health Check
app.get("/", (req, res) => {
  res.send("✅ API is working!");
});

export default app;
