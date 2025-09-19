# AI Notes Summarizer

A powerful full-stack web application that uses Google's Gemini AI to transform lengthy notes, documents, and research materials into concise, structured summaries. Built with React frontend and Node.js backend, featuring advanced file processing and Firebase integration.

## 🌟 Features

### Core AI Functionality
- **Google Gemini AI Integration**: Advanced text summarization with hierarchical key points
- **Multi-Format Processing**: Support for PDF, DOCX, and image files (OCR)
- **Intelligent Text Extraction**: PDF parsing, Word document processing, and OCR for images
- **Structured Output**: Professional summaries with numbered, hierarchical key points

### File Processing Capabilities
- **PDF Documents**: Text extraction using pdf-extraction library
- **Word Documents**: DOCX file processing with Mammoth.js
- **Image OCR**: Text recognition from images using Tesseract.js
- **Batch Processing**: Handle multiple files simultaneously
- **File Validation**: Size limits (10MB) and type checking

### User Experience
- **Responsive Design**: Seamless experience across all devices
- **Real-time Processing**: Live progress tracking for uploads
- **Multiple Input Methods**: Paste text or upload files
- **History Management**: Track and revisit previous summaries
- **Authentication**: Firebase Auth with Google, Facebook, email, and guest mode

### Backend Features
- **RESTful API**: Clean, documented API endpoints
- **Firebase Integration**: Firestore database for user data and history
- **Error Handling**: Comprehensive validation and error responses
- **CORS Configuration**: Secure cross-origin resource sharing
- **Vercel Deployment**: Serverless function deployment

## 🏗️ Architecture

### Tech Stack
**Frontend:**
- React 18 with Hooks and Context API
- Tailwind CSS for styling
- Firebase Authentication
- React Router for navigation
- Lucide React for icons

**Backend:**
- Node.js with Express.js
- Google Gemini AI API
- Firebase Admin SDK
- Multer for file uploads
- Tesseract.js for OCR
- PDF-extraction and Mammoth.js for document processing

**Deployment:**
- Frontend: [Vercel](https://ai-powered-notes-summarizer.vercel.app)
- Backend: [Vercel Serverless Functions](https://ai-powered-notes-summarizer-backend.vercel.app)
- Database: Firebase Firestore

### Project Structure
```
├── Frontend/                    # React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── context/           # React Context providers
│   │   ├── pages/             # Page components
│   │   ├── config/            # Firebase client config
│   │   └── utils/             # Utility functions
│   └── package.json
├── api/                        # Vercel API routes
│   ├── notes.js               # Notes management
│   └── ocr.js                 # OCR processing
├── src/                        # Backend source code
│   ├── controllers/           # Request handlers
│   ├── services/              # Business logic
│   ├── routes/                # API routes
│   ├── middleware/            # Custom middleware
│   ├── config/                # Configuration files
│   └── utils/                 # Helper functions
├── package.json               # Backend dependencies
├── vercel.json               # Vercel deployment config
└── .gitignore
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Firebase project
- Google Gemini AI API key

### Backend Setup

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/shaheerali838/AI-Powered-Notes-Summarizer-Backend.git
   cd AI-Powered-Notes-Summarizer-Backend
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Firebase Admin SDK
   FIREBASE_TYPE=service_account
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY_ID=your_private_key_id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your_service_account_email
   FIREBASE_CLIENT_ID=your_client_id
   FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
   FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
   FIREBASE_CLIENT_X509_CERT_URL=your_client_cert_url
   FIREBASE_UNIVERSE_DOMAIN=googleapis.com
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd Frontend
   npm install
   ```

2. **Environment Variables**
   Create `.env` file in Frontend directory:
   ```env
   VITE_APP_API_URL=https://ai-powered-notes-summarizer-backend.vercel.app
   ```

3. **Firebase Client Configuration**
   Update `src/config/firebaseClient.js` with your Firebase config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "ai-notes-summarize.firebaseapp.com",
     projectId: "ai-notes-summarize",
     storageBucket: "ai-notes-summarize.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

4. **Start frontend**
   ```bash
   npm run dev
   ```

## 📡 API Documentation

### Base URL
- Development: `http://localhost:5000`
- Production: `https://ai-powered-notes-summarizer-backend.vercel.app`

### Endpoints

#### Text Summarization
```http
POST /api/summarize
Content-Type: application/json

{
  "text": "Your text content to summarize"
}
```

**Response:**
```json
{
  "id": "unique_id",
  "original": "Original text",
  "summary": "AI-generated summary",
  "keyPoints": ["1. First point", "2. Second point"]
}
```

#### File Upload and Processing
```http
POST /api/notes/upload
Content-Type: multipart/form-data

file: [PDF/DOCX/Image file]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "document.pdf",
    "extractedText": "Extracted text content",
    "summary": "AI-generated summary",
    "keyPoints": ["1. Key point", "2. Another point"],
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### History Management
```http
GET /api/history
Authorization: Bearer [firebase_token]
```

```http
DELETE /api/history/:id
Authorization: Bearer [firebase_token]
```

### Supported File Types
- **Documents**: PDF, DOCX
- **Images**: JPG, JPEG, PNG, GIF, BMP, TIFF, WebP
- **Maximum Size**: 10MB per file

## 🔒 Authentication & Security

### Firebase Authentication
- **Google OAuth**: Sign in with Google account
- **Facebook OAuth**: Sign in with Facebook account  
- **Email/Password**: Traditional email authentication
- **Guest Mode**: Anonymous authentication for temporary use

### Security Features
- Firebase Admin SDK for server-side authentication
- Token verification middleware
- CORS configuration for secure cross-origin requests
- Input validation and sanitization
- File type and size restrictions

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /summaries/{summaryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    match /history/{historyId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚀 Deployment

### Backend Deployment (Vercel)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables**
   Configure all environment variables in Vercel dashboard

### Frontend Deployment (Vercel)

1. **Build and Deploy**
   ```bash
   cd Frontend
   vercel --prod
   ```

2. **Update API URL**
   Set `VITE_APP_API_URL` to your deployed backend URL

### Environment Configuration

**Backend Environment Variables:**
- `GEMINI_API_KEY`: Google Gemini AI API key
- `FIREBASE_*`: Firebase Admin SDK credentials
- `PORT`: Server port (default: 5000)

**Frontend Environment Variables:**
- `VITE_APP_API_URL`: Backend API URL

## 🧪 Usage Examples

### Text Summarization
```bash
curl -X POST https://ai-powered-notes-summarizer-backend.vercel.app/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"text": "Your long text content here..."}'
```

### File Upload
```bash
curl -X POST https://ai-powered-notes-summarizer-backend.vercel.app/api/notes/upload \
  -F "file=@document.pdf"
```

### With Authentication
```bash
curl -X POST https://ai-powered-notes-summarizer-backend.vercel.app/api/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"text": "Your text content..."}'
```

## 🛠️ Development

### Available Scripts

**Backend:**
```bash
npm start       # Production server
npm run dev     # Development with nodemon
npm test        # Run tests
```

**Frontend:**
```bash
npm run dev     # Development server
npm run build   # Production build
npm run preview # Preview production build
npm run lint    # Lint code
```

### Code Structure Guidelines

**Controllers**: Handle HTTP requests and responses
**Services**: Business logic and external API calls
**Middleware**: Request processing and validation
**Utils**: Helper functions and utilities

### Error Handling
- Comprehensive error catching and logging
- User-friendly error messages
- Proper HTTP status codes
- Structured error responses

## 📊 Performance & Limits

### File Processing Limits
- **Maximum file size**: 10MB per file
- **Supported formats**: PDF, DOCX, Images
- **OCR languages**: English (extensible)
- **Concurrent uploads**: Multiple files supported

### API Rate Limits
- Google Gemini API limits apply
- Firebase Firestore read/write limits
- Vercel serverless function limits

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines
- Follow RESTful API conventions
- Write comprehensive error handling
- Add JSDoc comments for functions
- Test across different file types
- Ensure responsive design
- Maintain security best practices

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Google Gemini AI** for advanced text summarization
- **Firebase** for authentication and database services
- **Tesseract.js** for OCR capabilities
- **PDF-extraction** and **Mammoth.js** for document processing
- **Vercel** for serverless deployment platform

## 📞 Support

For support and questions:

1. Check [GitHub Issues](https://github.com/shaheerali838/AI-Powered-Notes-Summarizer-Backend/issues)
2. Create a new issue with detailed information
3. Contact: shaheerali838838@gmail.com

## 🔮 Roadmap

- [ ] Multi-language OCR support
- [ ] Advanced summarization options (length, style)
- [ ] Real-time collaborative features
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Integration with note-taking apps
- [ ] Bulk processing capabilities
- [ ] Custom AI model training

---

**Built with ❤️ by [Shaheer Ali](https://github.com/shaheerali838) using Google Gemini AI and modern web technologies**
