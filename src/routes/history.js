// src/routes/history.js
import express from "express";
import {
  getHistory,
  deleteSummary,
  getSummaryById,
  updateSummary,
  getSummaryStats,
} from "../services/historyServices.js";
import { verifyToken, allowGuests } from "../config/firebaseAdmin.js";

const router = express.Router();

// Apply auth middleware to all routes (allows both authenticated and guest users)
router.use(verifyToken);
router.use(allowGuests);

/**
 * GET /api/history
 * Get all summaries for the current user
 */
router.get("/", async (req, res) => {
  try {
    console.log("📚 Fetching user history...");

    const userId = req.user?.uid || null;
    const isGuest = req.isGuest;

    // Parse query parameters for pagination
    const options = {
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || "createdAt",
      sortOrder: req.query.sortOrder || "desc",
    };

    console.log(`👤 User: ${userId || "guest"} | Options:`, options);

    const history = await getHistory(userId, options);

    res.status(200).json({
      success: true,
      data: history,
      metadata: {
        count: history.length,
        isGuest,
        userId: userId || null,
        ...options,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch history",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/history/stats
 * Get summary statistics for the current user
 */
router.get("/stats", async (req, res) => {
  try {
    console.log("📊 Fetching user statistics...");

    const userId = req.user?.uid || null;
    const stats = await getSummaryStats(userId);

    res.status(200).json({
      success: true,
      data: stats,
      metadata: {
        userId: userId || null,
        isGuest: req.isGuest,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/history/:id
 * Get a specific summary by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid || null;

    console.log(`🔍 Fetching summary: ${id} for user: ${userId || "guest"}`);

    const summary = await getSummaryById(id, userId);

    res.status(200).json({
      success: true,
      data: summary,
      metadata: {
        userId: userId || null,
        isGuest: req.isGuest,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ Error fetching summary ${req.params.id}:`, error);

    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error:
        statusCode === 404 ? "Summary not found" : "Failed to fetch summary",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/history/:id
 * Delete a summary by ID
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid || null;

    console.log(`🗑️ Deleting summary: ${id} for user: ${userId || "guest"}`);

    const result = await deleteSummary(id, userId);

    res.status(200).json({
      success: true,
      message: "Summary deleted successfully",
      data: result,
      metadata: {
        userId: userId || null,
        isGuest: req.isGuest,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ Error deleting summary ${req.params.id}:`, error);

    const statusCode =
      error.message.includes("not found") ||
      error.message.includes("access denied")
        ? 404
        : 500;
    res.status(statusCode).json({
      success: false,
      error:
        statusCode === 404
          ? "Summary not found or access denied"
          : "Failed to delete summary",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/history/:id
 * Update a summary by ID
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid || null;
    const updates = req.body;

    console.log(`✏️ Updating summary: ${id} for user: ${userId || "guest"}`);

    // Validate update data
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No update data provided",
        timestamp: new Date().toISOString(),
      });
    }

    const updatedSummary = await updateSummary(id, updates, userId);

    res.status(200).json({
      success: true,
      message: "Summary updated successfully",
      data: updatedSummary,
      metadata: {
        userId: userId || null,
        isGuest: req.isGuest,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ Error updating summary ${req.params.id}:`, error);

    const statusCode =
      error.message.includes("not found") ||
      error.message.includes("access denied")
        ? 404
        : 500;
    res.status(statusCode).json({
      success: false,
      error:
        statusCode === 404
          ? "Summary not found or access denied"
          : "Failed to update summary",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/history
 * Clear all history for the current user (bulk delete)
 */
router.delete("/", async (req, res) => {
  try {
    const userId = req.user?.uid || null;

    console.log(`🗑️ Clearing all history for user: ${userId || "guest"}`);

    // Get all summaries first
    const allSummaries = await getHistory(userId);

    // Delete each summary
    const deletePromises = allSummaries.map((summary) =>
      deleteSummary(summary.id, userId)
    );

    await Promise.all(deletePromises);

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${allSummaries.length} summaries`,
      data: {
        deletedCount: allSummaries.length,
      },
      metadata: {
        userId: userId || null,
        isGuest: req.isGuest,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error clearing history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to clear history",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
