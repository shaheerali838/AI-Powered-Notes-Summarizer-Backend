export function formatResponse(original, summary) {
  return {
    original,
    summary,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format file upload response
 */
export function formatFileUploadResponse(filename, extractedText, summary, keyPoints) {
  return {
    success: true,
    data: {
      filename,
      extractedText,
      summary,
      keyPoints,
      timestamp: new Date().toISOString(),
    }
  };
}

/**
 * Format error response
 */
export function formatErrorResponse(error, statusCode = 500) {
  return {
    success: false,
    error: error.message || error,
    statusCode,
    timestamp: new Date().toISOString(),
  };
}
