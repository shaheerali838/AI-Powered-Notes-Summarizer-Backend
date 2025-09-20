import nc from 'next-connect';
import multer from 'multer';
import { allowGuest } from '../../lib/auth.js';
import { processFile, validateFile } from '../../lib/fileProcessor.js';
import { getExtractionsCollection } from '../../lib/db.js';
import cors, { runMiddleware } from '../../lib/cors.js';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png', 
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

const handler = nc({
  onError: (err, req, res, next) => {
    console.error('Upload error:', err);
    
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'File too large. Maximum size is 10MB.' 
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          error: 'Unexpected file field. Use "file" field name.' 
        });
      }
    }
    
    if (err.message.includes('Unsupported file type')) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: 'File upload failed' });
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

// Apply auth middleware (allows both authenticated and guest users)
handler.use(allowGuest);

// Apply multer middleware
handler.use(upload.single('file'));

handler.post(async (req, res) => {
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded. Please select a file.' 
      });
    }

    // Validate file properties
    const validationErrors = validateFile(req.file);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: `File validation failed: ${validationErrors.join(', ')}` 
      });
    }

    console.log(`📁 Processing upload: ${req.file.originalname} (${req.file.mimetype})`);

    // Process the file
    const result = await processFile(req.file);

    let savedId = null;

    // Save to database only for authenticated users
    if (req.user && req.user.role === 'user') {
      try {
        const extractions = await getExtractionsCollection();
        
        const extractionDoc = {
          userId: req.user.userId,
          filename: result.metadata.filename,
          fileType: result.metadata.fileType,
          mimetype: result.metadata.mimetype,
          fileSize: result.metadata.size,
          extractedText: result.text,
          extractedLength: result.metadata.extractedLength,
          wordCount: result.metadata.wordCount,
          createdAt: new Date(),
          version: '3.0'
        };

        const insertResult = await extractions.insertOne(extractionDoc);
        savedId = insertResult.insertedId.toString();
        
        console.log(`✅ Extraction saved to database: ${savedId}`);
      } catch (dbError) {
        console.error('⚠️ Database save failed (non-critical):', dbError);
        // Continue with response - DB failure shouldn't break the upload
      }
    } else {
      console.log('👤 Guest user - not saving to database');
    }

    // Return successful response
    res.status(200).json({
      text: result.text,
      metadata: {
        ...result.metadata,
        processingTime: Date.now(),
        userType: req.user?.role || 'guest'
      },
      ...(savedId && { savedId })
    });

  } catch (error) {
    console.error('❌ Upload processing failed:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('No readable text')) {
      return res.status(422).json({ 
        error: 'No readable text found in the file. Please ensure the file contains text content.' 
      });
    }
    
    if (error.message.includes('password')) {
      return res.status(422).json({ 
        error: 'Password-protected files are not supported. Please remove the password and try again.' 
      });
    }
    
    if (error.message.includes('corrupted') || error.message.includes('Invalid')) {
      return res.status(422).json({ 
        error: 'The file appears to be corrupted or invalid. Please try a different file.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to process the uploaded file. Please try again.' 
    });
  }
});

// Disable Next.js body parser for this route
export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;