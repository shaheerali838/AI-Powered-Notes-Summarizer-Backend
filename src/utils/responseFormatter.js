export function formatResponse(original, summary) {
  return {
    original,
    summary,
    timestamp: new Date().toISOString(),
  };
}
