import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js';

// Configure PDF.js for Node.js environment
if (typeof globalThis !== 'undefined' && !globalThis.btoa) {
  globalThis.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
  globalThis.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

// Extract text from PDF buffer
export async function extractTextFromPDF(buffer) {
  try {
    console.log('🔄 Starting PDF text extraction...');
    
    const pdf = await getDocument({ 
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0
    }).promise;
    
    const numPages = pdf.numPages;
    console.log(`📄 PDF has ${numPages} pages`);
    
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map(item => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (pageText) {
          fullText += pageText + '\n';
        }
        
        // Clean up page resources
        page.cleanup();
      } catch (pageError) {
        console.warn(`⚠️ Error processing page ${pageNum}:`, pageError.message);
        continue;
      }
    }
    
    // Clean up PDF resources
    pdf.destroy();
    
    const cleanText = fullText.trim();
    
    if (!cleanText || cleanText.length < 10) {
      throw new Error('No readable text found in PDF. The document may be image-based or corrupted.');
    }
    
    console.log(`✅ PDF extraction complete: ${cleanText.length} characters`);
    return cleanText;
    
  } catch (error) {
    console.error('❌ PDF extraction failed:', error);
    
    if (error.message.includes('Invalid PDF')) {
      throw new Error('Invalid or corrupted PDF file. Please try a different file.');
    } else if (error.message.includes('password')) {
      throw new Error('Password-protected PDFs are not supported. Please remove the password and try again.');
    } else {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }
}

// Extract text from DOCX buffer
export async function extractTextFromDOCX(buffer) {
  try {
    console.log('🔄 Starting DOCX text extraction...');
    
    const result = await mammoth.extractRawText({
      buffer: buffer,
      options: {
        ignoreEmptyParagraphs: true,
        convertImage: mammoth.images.ignore
      }
    });
    
    const extractedText = result.value
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!extractedText || extractedText.length < 10) {
      throw new Error('No readable text found in DOCX file. The document may be empty.');
    }
    
    // Log any conversion warnings
    if (result.messages && result.messages.length > 0) {
      console.log('ℹ️ DOCX conversion messages:', result.messages.slice(0, 3));
    }
    
    console.log(`✅ DOCX extraction complete: ${extractedText.length} characters`);
    return extractedText;
    
  } catch (error) {
    console.error('❌ DOCX extraction failed:', error);
    throw new Error(`DOCX processing failed: ${error.message}`);
  }
}

// Extract text from image buffer using OCR
export async function extractTextFromImage(buffer) {
  let worker;
  
  try {
    console.log('🔄 Starting OCR text extraction...');
    
    // Create Tesseract worker with optional custom language data path
    const workerOptions = {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`🔄 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    };
    
    // Use custom tessdata URL if provided
    if (process.env.TESSDATA_URL) {
      workerOptions.langPath = process.env.TESSDATA_URL;
    }
    
    worker = await createWorker('eng', 1, workerOptions);
    
    // Configure OCR parameters for better accuracy
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()-[]{}"\'/\\@#$%^&*+=<>|~`',
      tessedit_pageseg_mode: '1', // Automatic page segmentation
      preserve_interword_spaces: '1'
    });
    
    // Perform OCR recognition
    const { data: { text, confidence } } = await worker.recognize(buffer);
    
    // Clean up extracted text
    const cleanText = text
      .replace(/\n\s*\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`✅ OCR complete: ${cleanText.length} characters, confidence: ${Math.round(confidence)}%`);
    
    if (!cleanText || cleanText.length < 5) {
      throw new Error('No readable text found in image. Please ensure the image contains clear, high-contrast text.');
    }
    
    if (confidence < 30) {
      console.warn('⚠️ Low OCR confidence detected. Text accuracy may be reduced.');
    }
    
    return cleanText;
    
  } catch (error) {
    console.error('❌ OCR extraction failed:', error);
    
    if (error.message.includes('worker')) {
      throw new Error('OCR service initialization failed. Please try again.');
    } else {
      throw new Error(`Image text extraction failed: ${error.message}`);
    }
  } finally {
    // Always clean up the worker
    if (worker) {
      try {
        await worker.terminate();
        console.log('🧹 OCR worker cleaned up');
      } catch (cleanupError) {
        console.error('⚠️ OCR worker cleanup error:', cleanupError);
      }
    }
  }
}

// Main file processing function
export async function processFile(file) {
  const { buffer, mimetype, originalname, size } = file;
  
  console.log(`📁 Processing file: ${originalname} (${mimetype}, ${(size / 1024 / 1024).toFixed(2)}MB)`);
  
  try {
    let extractedText = '';
    let fileType = '';
    
    if (mimetype === 'application/pdf') {
      extractedText = await extractTextFromPDF(buffer);
      fileType = 'PDF';
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      extractedText = await extractTextFromDOCX(buffer);
      fileType = 'DOCX';
    } else if (mimetype.startsWith('image/')) {
      extractedText = await extractTextFromImage(buffer);
      fileType = 'Image (OCR)';
    } else {
      throw new Error(`Unsupported file type: ${mimetype}`);
    }
    
    // Final validation and cleanup
    const finalText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+$/gm, '')
      .trim();
    
    if (finalText.length < 10) {
      throw new Error('Extracted text is too short to be meaningful.');
    }
    
    console.log(`✅ ${fileType} processing complete: ${finalText.length} characters`);
    
    return {
      text: finalText,
      metadata: {
        filename: originalname,
        fileType,
        mimetype,
        size,
        extractedLength: finalText.length,
        wordCount: finalText.split(/\s+/).filter(word => word.length > 0).length
      }
    };
    
  } catch (error) {
    console.error(`❌ File processing failed for ${originalname}:`, error);
    throw new Error(`Failed to process "${originalname}": ${error.message}`);
  }
}

// Validate file before processing
export function validateFile(file) {
  const errors = [];
  const { mimetype, size, originalname } = file;
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (size > maxSize) {
    errors.push(`File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit`);
  }
  
  // Check supported file types
  const supportedTypes = [
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
  
  if (!supportedTypes.includes(mimetype)) {
    errors.push(`Unsupported file type: ${mimetype}. Supported: PDF, DOCX, and images (JPEG, PNG, GIF, BMP, TIFF, WebP)`);
  }
  
  // Basic filename validation
  if (!originalname || originalname.length > 255) {
    errors.push('Invalid filename');
  }
  
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (originalname && dangerousChars.test(originalname)) {
    errors.push('Filename contains unsafe characters');
  }
  
  return errors;
}