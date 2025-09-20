// src/utils/responseFormatter.js

/**
 * Format basic response for text summarization
 */
export function formatResponse(original, summary, keyPoints = []) {
  return {
    success: true,
    data: {
      original,
      summary,
      keyPoints,
      metadata: {
        originalLength: original ? original.length : 0,
        summaryLength: summary ? summary.length : 0,
        keyPointsCount: keyPoints ? keyPoints.length : 0,
        compressionRatio:
          original && summary
            ? (
                ((original.length - summary.length) / original.length) *
                100
              ).toFixed(1) + "%"
            : "N/A",
      },
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Format file upload response with comprehensive metadata
 */
export function formatFileUploadResponse(
  filename,
  extractedText,
  summary,
  keyPoints,
  additionalMetadata = {}
) {
  const baseResponse = {
    success: true,
    data: {
      filename,
      extractedText,
      summary,
      keyPoints,

      // Processing metadata
      processing: {
        extractedLength: extractedText ? extractedText.length : 0,
        summaryLength: summary ? summary.length : 0,
        keyPointsCount: keyPoints ? keyPoints.length : 0,
        compressionRatio:
          extractedText && summary
            ? (
                ((extractedText.length - summary.length) /
                  extractedText.length) *
                100
              ).toFixed(1) + "%"
            : "N/A",
        wordCount: extractedText
          ? extractedText.split(/\s+/).filter((word) => word.length > 0).length
          : 0,
        summaryWordCount: summary
          ? summary.split(/\s+/).filter((word) => word.length > 0).length
          : 0,
        ...additionalMetadata,
      },

      // File metadata
      file: {
        name: filename,
        type: additionalMetadata.fileType || "Unknown",
        size: additionalMetadata.fileSize || 0,
        sizeFormatted: additionalMetadata.fileSize
          ? formatFileSize(additionalMetadata.fileSize)
          : "Unknown",
      },

      timestamp: new Date().toISOString(),
    },
  };

  return baseResponse;
}

/**
 * Format error response with detailed information
 */
export function formatErrorResponse(
  error,
  statusCode = 500,
  additionalDetails = {}
) {
  const errorMessage =
    typeof error === "string"
      ? error
      : error.message || "Unknown error occurred";

  const response = {
    success: false,
    error: {
      message: errorMessage,
      statusCode,
      timestamp: new Date().toISOString(),

      // Add request ID for tracking (if available)
      requestId: additionalDetails.requestId || generateRequestId(),

      // Additional error context
      ...(additionalDetails &&
        Object.keys(additionalDetails).length > 0 && {
          details: additionalDetails,
        }),
    },
  };

  // Don't expose sensitive information in production
  if (process.env.NODE_ENV === "development") {
    response.error.stack = error.stack;
  }

  return response;
}

/**
 * Format success response for API endpoints
 */
export function formatSuccessResponse(
  data,
  message = "Operation completed successfully",
  metadata = {}
) {
  return {
    success: true,
    message,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Format paginated response
 */
export function formatPaginatedResponse(items, pagination = {}) {
  const {
    page = 1,
    limit = 50,
    total = items.length,
    hasNext = false,
    hasPrev = false,
  } = pagination;

  return {
    success: true,
    data: items,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages: Math.ceil(total / limit),
      hasNext,
      hasPrev,
      count: items.length,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format history response with enhanced metadata
 */
export function formatHistoryResponse(summaries, stats = {}) {
  return {
    success: true,
    data: {
      summaries: summaries.map((summary) => ({
        ...summary,
        // Ensure consistent date formatting
        createdAt:
          summary.createdAt instanceof Date
            ? summary.createdAt.toISOString()
            : summary.createdAt,
        updatedAt:
          summary.updatedAt instanceof Date
            ? summary.updatedAt.toISOString()
            : summary.updatedAt,

        // Add computed fields
        ageInDays: summary.createdAt
          ? Math.floor(
              (new Date() - new Date(summary.createdAt)) / (1000 * 60 * 60 * 24)
            )
          : null,

        // Format file size if present
        fileSizeFormatted: summary.fileSize
          ? formatFileSize(summary.fileSize)
          : null,
      })),
    },
    metadata: {
      totalCount: summaries.length,
      ...stats,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Format health check response
 */
export function formatHealthResponse(services = {}, overall = "healthy") {
  const timestamp = new Date().toISOString();

  return {
    success: true,
    status: overall,
    timestamp,
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: "MB",
    },
    services,
    version: process.env.APP_VERSION || "2.0.0",
    environment: process.env.NODE_ENV || "development",
  };
}

/**
 * Utility function to format file sizes
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format validation error response
 */
export function formatValidationErrorResponse(errors) {
  const formattedErrors = Array.isArray(errors) ? errors : [errors];

  return {
    success: false,
    error: {
      message: "Validation failed",
      statusCode: 400,
      type: "VALIDATION_ERROR",
      details: formattedErrors,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Format authentication error response
 */
export function formatAuthErrorResponse(message = "Authentication failed") {
  return {
    success: false,
    error: {
      message,
      statusCode: 401,
      type: "AUTH_ERROR",
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Format rate limit error response
 */
export function formatRateLimitErrorResponse(retryAfter = null) {
  return {
    success: false,
    error: {
      message: "Rate limit exceeded. Please try again later.",
      statusCode: 429,
      type: "RATE_LIMIT_ERROR",
      retryAfter,
      timestamp: new Date().toISOString(),
    },
  };
}
