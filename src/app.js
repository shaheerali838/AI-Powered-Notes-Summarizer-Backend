import express from "express";
import dotenv from "dotenv";
import summarizeRoutes from "./routes/summarize.js";
import historyRoutes from "./routes/history.js";
import notesRoutes from "./routes/notes.js";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());

const allowedOrigins = [
  "https://ai-powered-notes-summarizer.vercel.app",
  "http://localhost:5173",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// ✅ Apply CORS globally
app.use(cors(corsOptions));

// ✅ No need for app.options("/*")
// Express automatically handles OPTIONS preflight if cors() is used globally

// Routes
app.use("/api/summarize", summarizeRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/notes", notesRoutes);

// Health check
app.get("/", (req, res) => res.send("✅ API is working!"));

export default app;
