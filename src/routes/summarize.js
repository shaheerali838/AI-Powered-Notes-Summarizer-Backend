import express from "express";
import { summarizeController } from "../controllers/summarizeController.js";

const router = express.Router();

// Dummy route
router.post("/", summarizeController);

export default router;
