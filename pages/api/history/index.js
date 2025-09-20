import nc from 'next-connect';
import { requireAuth } from '../../../lib/auth.js';
import { getExtractionsCollection } from '../../../lib/db.js';
import cors, { runMiddleware } from '../../../lib/cors.js';

const handler = nc({
  onError: (err, req, res, next) => {
    console.error('History API error:', err);
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

// Require authentication for all history endpoints
handler.use(requireAuth);

// GET /api/history - Get user's extraction history
handler.get(async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const extractions = await getExtractionsCollection();
    
    // Build query
    const query = { userId: req.user.userId };
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // Get total count
    const total = await extractions.countDocuments(query);
    
    // Get paginated results
    const results = await extractions
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    // Format results
    const formattedResults = results.map(doc => ({
      id: doc._id.toString(),
      filename: doc.filename,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      extractedLength: doc.extractedLength,
      wordCount: doc.wordCount,
      createdAt: doc.createdAt,
      // Don't return full extracted text in list view for performance
      hasText: !!doc.extractedText
    }));
    
    res.status(200).json({
      extractions: formattedResults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Failed to fetch history:', error);
    res.status(500).json({ error: 'Failed to fetch extraction history' });
  }
});

export default handler;