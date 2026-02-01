/**
 * PDF Generation API Server
 * Uses the same method as the desktop Electron app
 * Deploy to Vercel, Railway, or any Node.js host
 * 
 * Mobile app calls this API to generate PDFs
 */

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Import the House Of Electronics renderer (we'll inline it for serverless compatibility)
const generateHouse Of ElectronicsInvoiceHTML = require('./ekhlas-invoice-renderer');

/**
 * POST /api/generate-pdf
 * Body: { invoiceData, templateId?, logoBase64? }
 * Returns: { success: true, pdfBase64: string } or { success: false, error: string }
 */
app.post('/api/generate-pdf', async (req, res) => {
  let browser = null;
  
  try {
    const { invoiceData, logoBase64 } = req.body;
    
    if (!invoiceData) {
      return res.status(400).json({ success: false, error: 'Missing invoiceData' });
    }
    
    console.log('Generating PDF for invoice:', invoiceData.invoiceNumber);
    
    // Generate HTML using the same template as desktop
    const htmlContent = generateHouse Of ElectronicsInvoiceHTML(invoiceData, logoBase64);
    
    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for fonts/images to load
    await page.waitForTimeout(1000);
    
    // Generate PDF - same settings as desktop Electron
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      }
    });
    
    console.log('PDF generated, size:', pdfBuffer.length, 'bytes');
    
    // Return as base64
    const pdfBase64 = pdfBuffer.toString('base64');
    
    res.json({ success: true, pdfBase64 });
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'pdf-generator' });
});

// For local development
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PDF Generator API running on port ${PORT}`);
});

module.exports = app;

