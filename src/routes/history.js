// src/routes/history.js
import express from "express";
import { getHistory, deleteHistory } from "../services/historyServices.js";

const router = express.Router();

// GET all history
router.get("/", async (req, res) => {
  try {
    const history = await getHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE history item by id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteHistory(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
