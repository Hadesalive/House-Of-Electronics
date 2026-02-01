/**
 * Puppeteer PDF Generator - React Server Components Integration
 * 
 * This service uses your actual React template renderers to generate PDFs.
 * Benefits:
 * - Single source of truth (one template design)
 * - Perfect visual consistency between screen and PDF
 * - All 9 templates work automatically
 * - Multi-page support preserved
 * - Offline-capable
 */

import puppeteer, { Browser } from 'puppeteer';
import { renderInvoiceToHTML } from './react-to-html';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  invoiceType?: string;
  currency?: string;
  paidAmount?: number;
  balance?: number;
  status?: string;
  company: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
    logo?: string;
  };
  customer: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    email?: string;
  };
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  taxRate: number;
  discount: number;
  bankDetails?: {
    bankName: string;
    accountName?: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
  };
}

interface PDFGenerationOptions {
  templateId: string;
  data: InvoiceData;
  brandLogos?: string[];
  companyLogo?: string;
  footerContent?: {
    thankYouMessage: string;
    termsAndConditions: string;
  };
}

export class PuppeteerPDFGenerator {
  private static browser: Browser | null = null;

  /**
   * Initialize the browser instance (singleton pattern)
   */
  static async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      if (this.browser) {
        await this.browser.close();
      }
      
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Return browser to pool or close if pool is full
   */
  static async returnBrowser(browser: Browser): Promise<void> {
    // For now, just close the browser
    // In production, you'd implement a browser pool
    await browser.close();
  }

  /**
   * Generate PDF from invoice data using your actual template renderers
   */
  static async generateInvoicePDF(options: PDFGenerationOptions): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Set viewport for consistent rendering
      await page.setViewport({
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123, // A4 height in pixels at 96 DPI
        deviceScaleFactor: 2 // Higher quality
      });

      // Generate HTML content using your actual template system
      const htmlContent = await this.generateCleanInvoiceHTML(options);

      // Set content with faster loading (no external resources)
      await page.setContent(htmlContent, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Wait a bit for any remaining rendering
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Ensure fonts are loaded
      await page.evaluate(async () => {
        if (document.fonts) {
          await document.fonts.ready;
        }
      });

      // Generate PDF with high quality settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm'
        },
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        scale: 1
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Generate PDF from pre-rendered HTML content
   */
  static async generateInvoicePDFFromHTML(htmlContent: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    
    if (!browser || !browser.isConnected()) {
      throw new Error('Browser connection is not available');
    }
    
    const page = await browser.newPage();

    try {
      // Set content with the pre-rendered HTML
      await page.setContent(htmlContent, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Wait a bit for any remaining rendering
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Ensure fonts are loaded
      await page.evaluate(async () => {
        if (document.fonts) {
          await document.fonts.ready;
        }
      });

      // Generate PDF with optimized settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm'
        }
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Generate clean HTML from invoice data using the Pro Corporate template
   * This now includes payment tracking and bank details like the dynamic preview
   */
  private static async generateCleanInvoiceHTML(options: PDFGenerationOptions): Promise<string> {
    const { data, templateId } = options;
    
    // Use our new utility that generates HTML matching the ProCorporateRenderer
    return renderInvoiceToHTML(data, templateId);
  }


  /**
   * Clean up all browser instances
   */
  static async closeAll(): Promise<void> {
    // Close main browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
