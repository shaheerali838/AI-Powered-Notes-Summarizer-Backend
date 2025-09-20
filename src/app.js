// src/app.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import summarizeRoutes from "./routes/summarize.js";
import historyRoutes from "./routes/history.js";
import notesRoutes from "./routes/notes.js";

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy for serverless deployment
app.set("trust proxy", 1);

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enhanced CORS configuration for production
const allowedOrigins = [
  "https://ai-powered-notes-summarizer.vercel.app",
  "http://localhost:5173", // Vite dev server
  "http://localhost:3000", // Alternative dev port
  "http://127.0.0.1:5173", // Alternative localhost
];

// Development mode - allow additional origins
if (process.env.NODE_ENV === "development") {
  allowedOrigins.push(
    "http://localhost:5174",
    "http://localhost:4173", // Vite preview
    "http://localhost:8080"
  );
}

const corsOptions = {
  origin: (origin, callback) => {
    console.log(`🌐 CORS request from origin: ${origin || "null"}`);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log("✅ CORS: Allowing request with no origin");
      return callback(null, true);
    }

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      console.log("✅ CORS: Origin allowed");
      callback(null, true);
    } else {
      console.log("❌ CORS: Origin not allowed");
      const error = new Error(
        `CORS policy violation: Origin ${origin} not allowed`
      );
      error.status = 403;
      callback(error, false);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Cache-Control",
    "X-File-Name",
  ],
  credentials: true, // Allow cookies and auth headers
  maxAge: 86400, // Cache preflight response for 24 hours
  optionsSuccessStatus: 200, // For legacy browser support
};

// Apply CORS globally
app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(
    `${timestamp} | ${req.method} ${req.originalUrl} | Origin: ${
      req.get("Origin") || "none"
    }`
  );

  // Log request body size for file uploads
  if (req.method === "POST" && req.get("content-length")) {
    const size = parseInt(req.get("content-length"));
    console.log(`📊 Request size: ${(size / 1024 / 1024).toFixed(2)}MB`);
  }

  next();
});

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Notes Summarizer API is running!",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      summarize: "/api/summarize",
      notes: "/api/notes",
      history: "/api/history",
      health: "/health",
    },
  });
});

// Detailed health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      api: "operational",
      gemini: process.env.GEMINI_API_KEY ? "configured" : "not configured",
      firebase: process.env.FIREBASE_PROJECT_ID
        ? "configured"
        : "not configured",
    },
  });
});

// API Routes with prefixed paths
app.use("/api/summarize", summarizeRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/notes", notesRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  console.log(`❌ 404: Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "Route not found",
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      "GET /",
      "GET /health",
      "POST /api/summarize",
      "GET /api/history",
      "DELETE /api/history/:id",
      "POST /api/notes/upload",
    ],
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("🚨 Global error handler:", error);

  // Handle specific error types
  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      error: "Request too large",
      message:
        "The uploaded file or request body is too large. Maximum size is 50MB.",
      errorCode: "PAYLOAD_TOO_LARGE",
    });
  }

  if (error.message && error.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      error: "CORS Error",
      message: "Cross-origin request not allowed from this domain",
      errorCode: "CORS_ERROR",
    });
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON",
      message: "Request body contains invalid JSON",
      errorCode: "INVALID_JSON",
    });
  }

  // Default server error
  const statusCode = error.status || error.statusCode || 500;
  const message = error.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    error: "Server Error",
    message:
      statusCode === 500 ? "An unexpected server error occurred" : message,
    errorCode: "SERVER_ERROR",
    timestamp: new Date().toISOString(),
  });
});

export default app;
