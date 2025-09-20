// src/services/historyServices.js
import { db, getUserSummariesRef } from "../config/firebaseAdmin.js";

/**
 * Save a new summary to user's history
 * Enhanced with better error handling and metadata
 */
export const saveSummary = async (
  original,
  summary,
  keyPoints,
  metadata = {},
  userId = null
) => {
  try {
    console.log("💾 Saving summary to history...");

    const timestamp = new Date();
    const summaryData = {
      original: original || "",
      originalContent: original || "", // Alternative field name for compatibility
      summary: summary || "",
      summarizedContent: summary || "", // Alternative field name for compatibility
      keyPoints: keyPoints || [],
      createdAt: timestamp,
      timestamp: timestamp, // Alternative field name for compatibility

      // Additional metadata
      wordCount: original
        ? original.split(/\s+/).filter((word) => word.length > 0).length
        : 0,
      summaryWordCount: summary
        ? summary.split(/\s+/).filter((word) => word.length > 0).length
        : 0,
      keyPointsCount: keyPoints ? keyPoints.length : 0,

      // File metadata if provided
      ...(metadata.filename && { filename: metadata.filename }),
      ...(metadata.fileType && { fileType: metadata.fileType }),
      ...(metadata.fileSize && { fileSize: metadata.fileSize }),
      ...(metadata.processingTime && {
        processingTime: metadata.processingTime,
      }),

      // Additional fields
      version: "2.0", // For future compatibility
      source: metadata.source || "web_app",
    };

    let docRef;

    if (userId) {
      // Save to user's personal collection
      const userSummariesRef = getUserSummariesRef(userId);
      docRef = await userSummariesRef.add(summaryData);
      console.log(`✅ Summary saved to user collection: ${docRef.id}`);
    } else {
      // Save to global history collection (fallback)
      const historyCollection = db.collection("history");
      docRef = await historyCollection.add(summaryData);
      console.log(`✅ Summary saved to global history: ${docRef.id}`);
    }

    return {
      id: docRef.id,
      ...summaryData,
    };
  } catch (error) {
    console.error("❌ Error saving summary to history:", error);
    throw new Error(`Failed to save summary: ${error.message}`);
  }
};

/**
 * Get all summaries for a user (or global history if no user)
 * Enhanced with pagination and filtering
 */
export const getHistory = async (userId = null, options = {}) => {
  try {
    console.log(
      `📚 Fetching history${userId ? ` for user: ${userId}` : " (global)"}...`
    );

    const {
      limit = 50,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    let query;

    if (userId) {
      // Get user's personal history
      const userSummariesRef = getUserSummariesRef(userId);
      query = userSummariesRef.orderBy(sortBy, sortOrder);
    } else {
      // Get global history (fallback)
      const historyCollection = db.collection("history");
      query = historyCollection.orderBy(sortBy, sortOrder);
    }

    // Apply pagination
    if (offset > 0) {
      const offsetSnapshot = await query.limit(offset).get();
      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.limit(limit).get();

    const summaries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Ensure timestamps are properly formatted
      createdAt: doc.data().createdAt?.toDate
        ? doc.data().createdAt.toDate()
        : doc.data().createdAt,
      timestamp: doc.data().timestamp?.toDate
        ? doc.data().timestamp.toDate()
        : doc.data().timestamp,
    }));

    console.log(`✅ Retrieved ${summaries.length} summaries from history`);
    return summaries;
  } catch (error) {
    console.error("❌ Error fetching history:", error);
    throw new Error(`Failed to fetch history: ${error.message}`);
  }
};

/**
 * Get a specific summary by ID
 */
export const getSummaryById = async (summaryId, userId = null) => {
  try {
    console.log(`🔍 Fetching summary: ${summaryId}`);

    let docRef;

    if (userId) {
      const userSummariesRef = getUserSummariesRef(userId);
      docRef = userSummariesRef.doc(summaryId);
    } else {
      const historyCollection = db.collection("history");
      docRef = historyCollection.doc(summaryId);
    }

    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error("Summary not found");
    }

    const summaryData = {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate
        ? doc.data().createdAt.toDate()
        : doc.data().createdAt,
      timestamp: doc.data().timestamp?.toDate
        ? doc.data().timestamp.toDate()
        : doc.data().timestamp,
    };

    console.log(`✅ Summary retrieved: ${summaryId}`);
    return summaryData;
  } catch (error) {
    console.error(`❌ Error fetching summary ${summaryId}:`, error);
    throw new Error(`Failed to fetch summary: ${error.message}`);
  }
};

/**
 * Delete a summary by ID
 * Enhanced with user ownership verification
 */
export const deleteSummary = async (summaryId, userId = null) => {
  try {
    console.log(`🗑️ Deleting summary: ${summaryId}`);

    let docRef;

    if (userId) {
      const userSummariesRef = getUserSummariesRef(userId);
      docRef = userSummariesRef.doc(summaryId);

      // Verify the document exists and belongs to the user
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error("Summary not found or access denied");
      }
    } else {
      const historyCollection = db.collection("history");
      docRef = historyCollection.doc(summaryId);
    }

    await docRef.delete();
    console.log(`✅ Summary deleted: ${summaryId}`);

    return { success: true, id: summaryId };
  } catch (error) {
    console.error(`❌ Error deleting summary ${summaryId}:`, error);
    throw new Error(`Failed to delete summary: ${error.message}`);
  }
};

/**
 * Update a summary by ID
 */
export const updateSummary = async (summaryId, updates, userId = null) => {
  try {
    console.log(`✏️ Updating summary: ${summaryId}`);

    let docRef;

    if (userId) {
      const userSummariesRef = getUserSummariesRef(userId);
      docRef = userSummariesRef.doc(summaryId);

      // Verify the document exists and belongs to the user
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error("Summary not found or access denied");
      }
    } else {
      const historyCollection = db.collection("history");
      docRef = historyCollection.doc(summaryId);
    }

    const updateData = {
      ...updates,
      updatedAt: new Date(),
      version: "2.0",
    };

    await docRef.update(updateData);
    console.log(`✅ Summary updated: ${summaryId}`);

    // Return the updated document
    const updatedDoc = await docRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data().createdAt?.toDate
        ? updatedDoc.data().createdAt.toDate()
        : updatedDoc.data().createdAt,
      updatedAt: updatedDoc.data().updatedAt?.toDate
        ? updatedDoc.data().updatedAt.toDate()
        : updatedDoc.data().updatedAt,
    };
  } catch (error) {
    console.error(`❌ Error updating summary ${summaryId}:`, error);
    throw new Error(`Failed to update summary: ${error.message}`);
  }
};

/**
 * Get summary statistics for a user
 */
export const getSummaryStats = async (userId = null) => {
  try {
    console.log(
      `📊 Fetching summary statistics${
        userId ? ` for user: ${userId}` : " (global)"
      }...`
    );

    let collectionRef;

    if (userId) {
      collectionRef = getUserSummariesRef(userId);
    } else {
      collectionRef = db.collection("history");
    }

    const snapshot = await collectionRef.get();
    const summaries = snapshot.docs.map((doc) => doc.data());

    const stats = {
      totalSummaries: summaries.length,
      totalWords: summaries.reduce((sum, s) => sum + (s.wordCount || 0), 0),
      totalKeyPoints: summaries.reduce(
        (sum, s) => sum + (s.keyPointsCount || 0),
        0
      ),
      averageWordsPerSummary:
        summaries.length > 0
          ? Math.round(
              summaries.reduce((sum, s) => sum + (s.wordCount || 0), 0) /
                summaries.length
            )
          : 0,
      fileTypes: {},
      recentActivity: {
        last7Days: 0,
        last30Days: 0,
      },
    };

    // Count file types
    summaries.forEach((summary) => {
      const fileType = summary.fileType || "text";
      stats.fileTypes[fileType] = (stats.fileTypes[fileType] || 0) + 1;
    });

    // Count recent activity
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    summaries.forEach((summary) => {
      const createdAt = summary.createdAt?.toDate
        ? summary.createdAt.toDate()
        : new Date(summary.createdAt);
      if (createdAt > sevenDaysAgo) stats.recentActivity.last7Days++;
      if (createdAt > thirtyDaysAgo) stats.recentActivity.last30Days++;
    });

    console.log(`✅ Statistics calculated: ${stats.totalSummaries} summaries`);
    return stats;
  } catch (error) {
    console.error("❌ Error fetching summary statistics:", error);
    throw new Error(`Failed to fetch statistics: ${error.message}`);
  }
};
