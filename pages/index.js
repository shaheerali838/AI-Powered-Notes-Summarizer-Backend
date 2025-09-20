export default function Home() {
  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1>AI Notes Summarizer Backend</h1>
      <p>Serverless backend API for AI-powered text extraction and summarization.</p>
      
      <h2>Available Endpoints:</h2>
      <ul>
        <li><code>POST /api/auth/verify</code> - Verify Google/Facebook tokens</li>
        <li><code>POST /api/auth/guest</code> - Create guest session</li>
        <li><code>POST /api/upload</code> - Upload and process files</li>
        <li><code>GET /api/history</code> - Get extraction history (auth required)</li>
        <li><code>DELETE /api/history/[id]</code> - Delete extraction (auth required)</li>
      </ul>
      
      <h2>Supported File Types:</h2>
      <ul>
        <li>PDF documents</li>
        <li>DOCX (Word documents)</li>
        <li>Images (JPEG, PNG, GIF, BMP, TIFF, WebP) with OCR</li>
      </ul>
      
      <p>Maximum file size: 10MB</p>
      
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '4px' 
      }}>
        <strong>Status:</strong> API is running ✅
        <br />
        <strong>Version:</strong> 3.0.0
        <br />
        <strong>Environment:</strong> {process.env.NODE_ENV || 'development'}
      </div>
    </div>
  );
}