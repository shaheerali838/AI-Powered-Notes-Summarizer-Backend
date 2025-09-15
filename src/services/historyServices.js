// src/services/historyServices.js
import { db } from "../config/firebase.js";

const historyCollection = db.collection("history");

// Save a new summary
export const saveSummary = async (original, summary, keyPoints) => {
  const timestamp = new Date().toISOString();
  const docRef = await historyCollection.add({
    original,
    summary,
    keyPoints,
    timestamp,
  });

  return {
    id: docRef.id,
    original,
    summary,
    keyPoints,
    timestamp,
  };
};

// Get all summaries
export const getHistory = async () => {
  const snapshot = await historyCollection.orderBy("timestamp", "desc").get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Delete a summary by ID
export const deleteHistory = async (id) => {
  await historyCollection.doc(id).delete();
  return { success: true };
};
