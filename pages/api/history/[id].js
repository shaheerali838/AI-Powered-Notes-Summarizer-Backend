import nc from 'next-connect';
import { ObjectId } from 'mongodb';
import { requireAuth } from '../../../lib/auth.js';
import { getExtractionsCollection } from '../../../lib/db.js';
import cors, { runMiddleware } from '../../../lib/cors.js';

const handler = nc({
  onError: (err, req, res, next) => {
    console.error('History item API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  },
  onNoMatch: (req, res) => {
    res.status(405).json({ error: 'Method not allowed' });
  },
});

// Apply CORS
handler.use(async (req, res, next) => {
  await runMiddleware(req, res, cors);
  next();
});

// Require authentication
handler.use(requireAuth);

// GET /api/history/[id] - Get specific extraction
handler.get(async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid extraction ID' });
    }
    
    const extractions = await getExtractionsCollection();
    const extraction = await extractions.findOne({
      _id: new ObjectId(id),
      userId: req.user.userId
    });
    
    if (!extraction) {
      return res.status(404).json({ error: 'Extraction not found' });
    }
    
    res.status(200).json({
      id: extraction._id.toString(),
      filename: extraction.filename,
      fileType: extraction.fileType,
      mimetype: extraction.mimetype,
      fileSize: extraction.fileSize,
      extractedText: extraction.extractedText,
      extractedLength: extraction.extractedLength,
      wordCount: extraction.wordCount,
      createdAt: extraction.createdAt
    });

  } catch (error) {
    console.error('Failed to fetch extraction:', error);
    res.status(500).json({ error: 'Failed to fetch extraction' });
  }
});

// DELETE /api/history/[id] - Delete specific extraction
handler.delete(async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid extraction ID' });
    }
    
    const extractions = await getExtractionsCollection();
    const result = await extractions.deleteOne({
      _id: new ObjectId(id),
      userId: req.user.userId
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Extraction not found' });
    }
    
    res.status(200).json({ 
      message: 'Extraction deleted successfully',
      id 
    });

  } catch (error) {
    console.error('Failed to delete extraction:', error);
    res.status(500).json({ error: 'Failed to delete extraction' });
  }
});

export default handler;