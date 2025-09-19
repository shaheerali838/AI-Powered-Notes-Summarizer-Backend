import express from "express";
import { uploadFile, handleUploadError } from "../middleware/uploadFile.js";
import { uploadFileController } from "../controllers/notesController.js";

const router = express.Router();

/**
 * POST /api/notes/upload
 * Upload and process files (PDF, DOCX, Images)
 * Extract text and generate summary
 */
router.post(
  "/upload",
  (req, res, next) => {
    uploadFile(req, res, (err) => {
      if (err) return handleUploadError(err, req, res, next);
      next();
    });
  },
  uploadFileController
);

export default router;
