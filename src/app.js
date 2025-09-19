import express from "express";
import dotenv from "dotenv";
import summarizeRoutes from "./routes/summarize.js";
import historyRoutes from "./routes/history.js"; // ✅ import history routes
import notesRoutes from "./routes/notes.js"; // ✅ import notes routes
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ Enable CORS for frontend (Vercel hosted domain)
app.use(
  cors({
    origin: "https://ai-powered-notes-summarizer.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // include OPTIONS
    allowedHeaders: ["Content-Type", "Authorization"], // allow headers
    credentials: true,
  })
);

// Routes
app.use("/api/summarize", summarizeRoutes);
app.use("/api/history", historyRoutes); // ✅ history route
app.use("/api/notes", notesRoutes); // ✅ notes route

// Health Check
app.get("/", (req, res) => {
  res.send("✅ API is working!");
});

export default app;
