# AI Notes Summarizer Backend

A robust serverless backend built with Next.js API routes for AI-powered text extraction and summarization. Supports PDF, DOCX, and image processing with OCR capabilities.

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/ai-notes-summarizer-backend)

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB Atlas account
- Google OAuth credentials (optional)
- Facebook App credentials (optional)

## 🛠️ Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd ai-notes-summarizer-backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

3. **Configure your `.env.local` file:**
   ```env
   # Required
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-notes-summarizer
   JWT_SECRET=your-super-secret-jwt-key-here
   
   # Optional (for social auth)
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   FACEBOOK_APP_ID=your-facebook-app-id
   FACEBOOK_APP_SECRET=your-facebook-app-secret
   
   # Optional (for custom OCR language data)
   TESSDATA_URL=https://tessdata.projectnaptha.com/4.0.0/
   
   # Production settings
   NODE_ENV=production
   ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
   ```

4. **Run locally:**
   ```bash
   npm run dev
   ```

## 🌐 Deploy to Vercel

### Method 1: Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

### Method 2: GitHub Integration
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Required Environment Variables in Vercel:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens (generate with `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` - (Optional) Google OAuth client ID
- `FACEBOOK_APP_ID` - (Optional) Facebook app ID  
- `FACEBOOK_APP_SECRET` - (Optional) Facebook app secret
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins
- `NODE_ENV` - Set to `production`

## 📡 API Endpoints

### Authentication

#### POST `/api/auth/verify`
Verify Google or Facebook tokens and return JWT.

**Request:**
```json
{
  "provider": "google",
  "token": "google_id_token_here"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "profile_picture_url",
    "provider": "google"
  }
}
```

#### POST `/api/auth/guest`
Create a guest session token.

**Response:**
```json
{
  "token": "guest_jwt_token",
  "user": {
    "role": "guest",
    "sessionId": "guest_session_id",
    "expiresAt": "2024-01-01T01:00:00.000Z"
  }
}
```

### File Processing

#### POST `/api/upload`
Upload and extract text from files. Supports both authenticated users and guests.

**Headers:**
```
Authorization: Bearer <jwt_token>  // Optional for guests
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: PDF, DOCX, or image file (max 10MB)

**Response:**
```json
{
  "text": "Extracted text content...",
  "metadata": {
    "filename": "document.pdf",
    "fileType": "PDF",
    "mimetype": "application/pdf",
    "size": 1024000,
    "extractedLength": 5000,
    "wordCount": 800,
    "processingTime": 1640995200000,
    "userType": "user"
  },
  "savedId": "extraction_id_if_authenticated"
}
```

### History (Authenticated Users Only)

#### GET `/api/history`
Get user's extraction history with pagination.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - Sort direction: asc/desc (default: desc)

**Response:**
```json
{
  "extractions": [
    {
      "id": "extraction_id",
      "filename": "document.pdf",
      "fileType": "PDF",
      "fileSize": 1024000,
      "extractedLength": 5000,
      "wordCount": 800,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "hasText": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET `/api/history/[id]`
Get specific extraction with full text.

#### DELETE `/api/history/[id]`
Delete specific extraction.

## 🧪 Testing

### Manual Testing with cURL

1. **Test guest authentication:**
   ```bash
   curl -X POST https://your-backend.vercel.app/api/auth/guest \
     -H "Content-Type: application/json"
   ```

2. **Test file upload (guest):**
   ```bash
   curl -X POST https://your-backend.vercel.app/api/upload \
     -F "file=@test-document.pdf"
   ```

3. **Test file upload (authenticated):**
   ```bash
   curl -X POST https://your-backend.vercel.app/api/upload \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "file=@test-document.pdf"
   ```

4. **Test CORS preflight:**
   ```bash
   curl -X OPTIONS https://your-backend.vercel.app/api/upload \
     -H "Origin: https://your-frontend.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Authorization"
   ```

5. **Test history (authenticated):**
   ```bash
   curl -X GET https://your-backend.vercel.app/api/history \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### Expected Results:
- ✅ Guest auth returns 200 with token containing `role: 'guest'`
- ✅ File upload returns 200 with extracted text (no ENOENT errors)
- ✅ CORS preflight returns proper headers
- ✅ History returns 401 for unauthenticated, 200 for authenticated
- ✅ All endpoints return JSON responses, never crash

## 🔧 What Was Fixed/Added

### 1. **ENOENT Errors Solved:**
- Removed all local file system dependencies
- Used buffer-based processing for all file types
- Implemented proper PDF.js configuration for serverless environment
- No test files or local asset dependencies

### 2. **CORS Issues Resolved:**
- Comprehensive CORS middleware with proper origin validation
- Handles preflight OPTIONS requests correctly
- Supports credentials and custom headers
- Environment-based origin configuration

### 3. **Route Crashes Prevented:**
- Comprehensive error handling with try-catch blocks
- Proper error responses (never crashes, always returns JSON)
- Multer error handling for file upload edge cases
- Database connection error handling

### 4. **PDF Parsing Errors Fixed:**
- Used `pdfjs-dist/legacy/build/pdf.js` for Node.js compatibility
- Proper buffer handling with Uint8Array conversion
- Page-by-page text extraction with cleanup
- Graceful handling of corrupted/password-protected PDFs

### 5. **Authentication & Security:**
- JWT-based authentication with secure cookies
- Google and Facebook token verification
- Guest session support without database persistence
- Proper CORS and security headers

### 6. **Database Integration:**
- MongoDB connection reuse pattern for serverless
- User management and extraction history
- Proper indexing and pagination
- Guest users don't persist data (client-side only)

### 7. **File Processing Robustness:**
- Memory-based multer storage (no disk writes)
- Comprehensive file validation
- Support for PDF, DOCX, and image OCR
- Proper cleanup of processing resources

## 🏗️ Architecture

```
├── lib/
│   ├── auth.js          # JWT & OAuth verification
│   ├── cors.js          # CORS middleware
│   ├── db.js            # MongoDB connection
│   └── fileProcessor.js # Text extraction logic
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── verify.js    # OAuth verification
│   │   │   └── guest.js     # Guest sessions
│   │   ├── history/
│   │   │   ├── index.js     # History listing
│   │   │   └── [id].js      # Individual extraction
│   │   └── upload.js        # File upload & processing
│   └── index.js         # API documentation page
├── next.config.js       # Next.js configuration
└── package.json         # Dependencies
```

## 📝 Notes

- **Guest users**: Data is not persisted on backend, keep history client-side
- **File limits**: 10MB maximum, validated on both client and server
- **Supported formats**: PDF, DOCX, JPEG, PNG, GIF, BMP, TIFF, WebP
- **OCR**: Uses Tesseract.js with English language support
- **Database**: MongoDB Atlas recommended for production
- **Deployment**: Optimized for Vercel serverless functions

## 🔒 Security Features

- JWT tokens with configurable expiry
- Secure HTTP-only cookies
- CORS protection with origin validation
- File type and size validation
- SQL injection protection (MongoDB)
- No sensitive data in logs
- Environment-based configuration

## 📞 Support

For issues or questions:
1. Check the logs in Vercel dashboard
2. Verify all environment variables are set
3. Test with the provided cURL commands
4. Check MongoDB connection and permissions

---

**Built for production deployment on Vercel with comprehensive error handling and security.**