/**
 * Professional Reports PDF Generator
 * Generates detailed, branded PDF reports for all report types
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  totalRevenue: number;
  totalSales: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  salesGrowth: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalSpent: number;
    orderCount: number;
  }>;
  salesByMonth: Array<{
    month: string;
    revenue: number;
    sales: number;
  }>;
  salesByStatus?: Array<{
    status: string;
    count: number;
    revenue: number;
  }>;
  salesByPaymentMethod?: Array<{
    method: string;
    count: number;
    revenue: number;
  }>;
  customerSegments?: Array<{
    segment: string;
    count: number;
    totalSpent: number;
    avgOrderValue: number;
  }>;
  productPerformance?: Array<{
    productId: string;
    productName: string;
    category: string;
    stock: number;
    totalSold: number;
    revenue: number;
    profitMargin: number;
  }>;
  categoryBreakdown?: Array<{
    category: string;
    revenue: number;
    count: number;
    avgPrice: number;
  }>;
  profitAnalysis?: {
    grossRevenue: number;
    totalCosts: number;
    netProfit: number;
    profitMargin: number;
  };
  inventoryStatus?: {
    totalItems: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  };
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
}

interface ReportConfig {
  reportType: 'sales' | 'customers' | 'products' | 'financial' | 'inventory';
  reportTitle: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  data: ReportData;
  company: CompanyInfo;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
}

export class ReportsPDFGenerator {
  private doc: jsPDF;
  private config: ReportConfig;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private primaryColor: [number, number, number] = [249, 115, 22]; // Orange
  private secondaryColor: [number, number, number] = [75, 85, 99]; // Gray

  constructor(config: ReportConfig) {
    this.config = config;
    this.doc = new jsPDF('portrait', 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
  }

  async generate(): Promise<void> {
    // Add header with logo
    await this.addHeader();

    // Add report metadata
    this.addReportMetadata();

    // Add content based on report type
    switch (this.config.reportType) {
      case 'sales':
        this.addSalesReport();
        break;
      case 'customers':
        this.addCustomersReport();
        break;
      case 'products':
        this.addProductsReport();
        break;
      case 'financial':
        this.addFinancialReport();
        break;
      case 'inventory':
        this.addInventoryReport();
        break;
    }

    // Add footer on all pages
    this.addFooters();
  }

  private async addHeader(): Promise<void> {
    const { company } = this.config;

    try {
      // Load House Of Electronics logo from public folder
      const logoPath = '/images/hoe logo.png';
      let logoDataUrl: string;

      try {
        // Try to load the logo
        const response = await fetch(logoPath);
        const blob = await response.blob();
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error loading logo, using text-only header:', error);
        this.addTextOnlyHeader();
        this.doc.setDrawColor(...this.primaryColor);
        this.doc.setLineWidth(0.5);
        this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
        this.currentY += 10;
        return;
      }

      // Header section - matching pro-corporate layout
      // Logo on the left, company info on the right

      // Get actual image dimensions to maintain aspect ratio
      const img = new Image();
      img.src = logoDataUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      // Calculate logo size maintaining original aspect ratio
      // Pro-corporate uses 300px x 120px (2.5:1 ratio)
      const imgAspectRatio = img.width / img.height;
      const logoHeight = 30; // Larger height in mm (matching pro-corporate proportions)
      const logoWidth = logoHeight * imgAspectRatio; // Width based on actual aspect ratio

      this.doc.addImage(logoDataUrl, 'PNG', this.margin, this.currentY, logoWidth, logoHeight, undefined, 'FAST');

      // Company info on the right - matching invoice style
      const rightMargin = this.pageWidth - this.margin;
      let infoY = this.currentY;

      // Company name (bold, larger, ORANGE)
      this.doc.setFontSize(11);
      this.doc.setTextColor(...this.primaryColor); // Orange color
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(company.name, rightMargin, infoY, { align: 'right' });
      infoY += 5;

      // Company details (smaller, regular)
      this.doc.setFontSize(9);
      this.doc.setTextColor(...this.secondaryColor);
      this.doc.setFont('helvetica', 'normal');

      if (company.address && company.address.trim()) {
        this.doc.text(company.address, rightMargin, infoY, { align: 'right' });
        infoY += 4;
      }

      // Skip a line before contact details
      infoY += 2;

      if (company.phone && company.phone.trim()) {
        this.doc.text(`Mobile: ${company.phone}`, rightMargin, infoY, { align: 'right' });
        infoY += 4;
      }

      if (company.email && company.email.trim()) {
        this.doc.text(company.email, rightMargin, infoY, { align: 'right' });
        infoY += 4;
      }

      // Ensure we move past both logo and info
      this.currentY += Math.max(logoHeight, infoY - this.currentY) + 5;

    } catch (error) {
      console.error('Error in header generation:', error);
      // Fallback to text-only header
      this.addTextOnlyHeader();
    }

    // Divider line (matching invoice style)
    this.doc.setDrawColor(...this.primaryColor);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;
  }

  private addTextOnlyHeader(): void {
    const { company } = this.config;

    this.doc.setFontSize(18);
    this.doc.setTextColor(...this.primaryColor);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(company.name, this.margin, this.currentY);
    this.currentY += 7;

    this.doc.setFontSize(9);
    this.doc.setTextColor(...this.secondaryColor);
    this.doc.setFont('helvetica', 'normal');

    if (company.address && company.address.trim()) {
      this.doc.text(company.address, this.margin, this.currentY);
      this.currentY += 4;
    }

    const contactInfo = [];
    if (company.phone && company.phone.trim()) contactInfo.push(`Phone: ${company.phone}`);
    if (company.email && company.email.trim()) contactInfo.push(`Email: ${company.email}`);

    if (contactInfo.length > 0) {
      this.doc.text(contactInfo.join(' | '), this.margin, this.currentY);
      this.currentY += 5;
    }

    this.currentY += 5;
  }

  private addReportMetadata(): void {
    // Report title
    this.doc.setFontSize(20);
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(this.config.reportTitle, this.margin, this.currentY);
    this.currentY += 10;

    // Date range and generation info
    this.doc.setFontSize(10);
    this.doc.setTextColor(...this.secondaryColor);
    this.doc.setFont('helvetica', 'normal');

    const startDate = this.formatDate(this.config.dateRange.start);
    const endDate = this.formatDate(this.config.dateRange.end);
    const generatedDate = this.formatDate(new Date());

    this.doc.text(`Report Period: ${startDate} - ${endDate}`, this.margin, this.currentY);
    this.currentY += 5;
    this.doc.text(`Generated: ${generatedDate}`, this.margin, this.currentY);
    this.currentY += 15;
  }

  private addSalesReport(): void {
    const { data, formatCurrency, formatNumber } = this.config;

    // Executive Summary Box
    this.addExecutiveSummary();

    // Key Performance Indicators
    this.addSectionTitle('Key Performance Indicators');

    const kpiData = [
      ['Total Revenue', formatCurrency(data.totalRevenue), `${data.revenueGrowth >= 0 ? '+' : ''}${data.revenueGrowth.toFixed(1)}%`],
      ['Total Transactions', formatNumber(data.totalSales), `${data.salesGrowth >= 0 ? '+' : ''}${data.salesGrowth.toFixed(1)}%`],
      ['Average Order Value', formatCurrency(data.totalSales > 0 ? data.totalRevenue / data.totalSales : 0), ''],
      ['Total Customers Served', formatNumber(data.totalCustomers), ''],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Key Metric', 'Value', 'Change']],
      body: kpiData,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 4,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { halign: 'right', cellWidth: 50, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 'auto', textColor: this.primaryColor },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
    this.checkPageBreak();

    // Sales by status
    if (data.salesByStatus && data.salesByStatus.length > 0) {
      this.addSectionTitle('Sales by Status');

      const statusData = data.salesByStatus.map(s => [
        s.status.charAt(0).toUpperCase() + s.status.slice(1),
        formatNumber(s.count),
        formatCurrency(s.revenue),
        `${((s.revenue / data.totalRevenue) * 100).toFixed(1)}%`
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Status', 'Count', 'Revenue', '% of Total']],
        body: statusData,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
      this.checkPageBreak();
    }

    // Sales by payment method
    if (data.salesByPaymentMethod && data.salesByPaymentMethod.length > 0) {
      this.addSectionTitle('Sales by Payment Method');

      const paymentData = data.salesByPaymentMethod.map(p => [
        p.method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        formatNumber(p.count),
        formatCurrency(p.revenue),
        `${((p.revenue / data.totalRevenue) * 100).toFixed(1)}%`
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Payment Method', 'Transactions', 'Revenue', '% of Total']],
        body: paymentData,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
      this.checkPageBreak();
    }

    // Top products - Enhanced presentation
    this.addSectionTitle('Top 10 Best-Selling Products');

    const topProductsData = data.topProducts.slice(0, 10).map((p, i) => [
      `${i + 1}`,
      p.productName,
      formatNumber(p.totalSold),
      formatCurrency(p.revenue),
      `${((p.revenue / data.totalRevenue) * 100).toFixed(1)}%`
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Rank', 'Product Name', 'Units Sold', 'Revenue', '% of Total']],
      body: topProductsData,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15, fontStyle: 'bold', textColor: this.primaryColor },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 25, textColor: this.secondaryColor },
      },
      margin: { left: this.margin, right: this.margin },
      alternateRowStyles: {
        fillColor: [252, 252, 252]
      },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
    this.checkPageBreak();

    // Top customers - Enhanced presentation
    this.addSectionTitle('Top 10 Most Valuable Customers');

    const topCustomersData = data.topCustomers.slice(0, 10).map((c, i) => [
      `${i + 1}`,
      c.customerName,
      formatNumber(c.orderCount),
      formatCurrency(c.totalSpent),
      formatCurrency(c.totalSpent / c.orderCount),
      `${((c.totalSpent / data.totalRevenue) * 100).toFixed(1)}%`
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Rank', 'Customer Name', 'Orders', 'Total Spent', 'Avg Order', '% of Revenue']],
      body: topCustomersData,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15, fontStyle: 'bold', textColor: this.primaryColor },
        1: { cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'center', cellWidth: 25, textColor: this.secondaryColor },
      },
      margin: { left: this.margin, right: this.margin },
      alternateRowStyles: {
        fillColor: [252, 252, 252]
      },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addCustomersReport(): void {
    const { data, formatCurrency, formatNumber } = this.config;

    // Key metrics
    this.addSectionTitle('Customer Overview');

    const customerKpis = [
      ['Total Customers', formatNumber(data.totalCustomers)],
      ['Total Revenue', formatCurrency(data.totalRevenue)],
      ['Average Customer Value', formatCurrency(data.totalCustomers > 0 ? data.totalRevenue / data.totalCustomers : 0)],
      ['Average Orders per Customer', formatNumber(data.totalCustomers > 0 ? data.totalSales / data.totalCustomers : 0)],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: customerKpis,
      theme: 'grid',
      headStyles: {
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { halign: 'right' },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
    this.checkPageBreak();

    // Customer segments
    if (data.customerSegments && data.customerSegments.length > 0) {
      this.addSectionTitle('Customer Segments');

      const segmentData = data.customerSegments.map(s => [
        s.segment,
        formatNumber(s.count),
        formatCurrency(s.totalSpent),
        formatCurrency(s.avgOrderValue)
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Segment', 'Customers', 'Total Spent', 'Avg Order Value']],
        body: segmentData,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
      this.checkPageBreak();
    }

    // Top customers
    this.addSectionTitle('Top 20 Customers');

    const customerData = data.topCustomers.slice(0, 20).map((c, i) => [
      `${i + 1}`,
      c.customerName,
      formatNumber(c.orderCount),
      formatCurrency(c.totalSpent),
      formatCurrency(c.totalSpent / c.orderCount)
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['#', 'Customer Name', 'Orders', 'Total Spent', 'Avg Order']],
      body: customerData,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addProductsReport(): void {
    const { data, formatCurrency, formatNumber } = this.config;

    // Key metrics
    this.addSectionTitle('Product Performance Overview');

    const productKpis = [
      ['Total Products', formatNumber(data.totalProducts)],
      ['Total Revenue', formatCurrency(data.totalRevenue)],
      ['Products Sold', formatNumber(data.topProducts.reduce((sum, p) => sum + p.totalSold, 0))],
      ['Average Product Revenue', formatCurrency(data.totalProducts > 0 ? data.totalRevenue / data.totalProducts : 0)],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: productKpis,
      theme: 'grid',
      headStyles: {
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { halign: 'right' },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
    this.checkPageBreak();

    // Category breakdown
    if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
      this.addSectionTitle('Sales by Category');

      const categoryData = data.categoryBreakdown.map(c => [
        c.category,
        formatNumber(c.count),
        formatCurrency(c.revenue),
        formatCurrency(c.avgPrice),
        `${((c.revenue / data.totalRevenue) * 100).toFixed(1)}%`
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Category', 'Products', 'Revenue', 'Avg Price', '% of Total']],
        body: categoryData,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
        },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
      this.checkPageBreak();
    }

    // Product performance
    if (data.productPerformance && data.productPerformance.length > 0) {
      this.addSectionTitle('Detailed Product Performance');

      const performanceData = data.productPerformance.slice(0, 20).map((p, i) => [
        `${i + 1}`,
        p.productName,
        p.category,
        formatNumber(p.stock),
        formatNumber(p.totalSold),
        formatCurrency(p.revenue),
        `${p.profitMargin.toFixed(1)}%`
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['#', 'Product', 'Category', 'Stock', 'Sold', 'Revenue', 'Margin']],
        body: performanceData,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          3: { halign: 'right', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 20 },
          5: { halign: 'right', cellWidth: 30 },
          6: { halign: 'right', cellWidth: 20 },
        },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    }
  }

  private addFinancialReport(): void {
    const { data, formatCurrency, formatNumber } = this.config;

    // Financial summary
    this.addSectionTitle('Financial Summary');

    const financialData = [
      ['Gross Revenue', formatCurrency(data.profitAnalysis?.grossRevenue || data.totalRevenue)],
      ['Total Costs', formatCurrency(data.profitAnalysis?.totalCosts || 0)],
      ['Net Profit', formatCurrency(data.profitAnalysis?.netProfit || 0)],
      ['Profit Margin', `${(data.profitAnalysis?.profitMargin || 0).toFixed(2)}%`],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: financialData,
      theme: 'grid',
      headStyles: {
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 11,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { halign: 'right' },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
    this.checkPageBreak();

    // Revenue breakdown
    this.addSectionTitle('Revenue Breakdown');

    const revenueData = [
      ['Total Sales', formatNumber(data.totalSales)],
      ['Total Revenue', formatCurrency(data.totalRevenue)],
      ['Average Order Value', formatCurrency(data.totalSales > 0 ? data.totalRevenue / data.totalSales : 0)],
      ['Revenue Growth', `${data.revenueGrowth >= 0 ? '+' : ''}${data.revenueGrowth.toFixed(1)}%`],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: revenueData,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'right' },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
    this.checkPageBreak();

    // Monthly revenue trend
    if (data.salesByMonth && data.salesByMonth.length > 0) {
      this.addSectionTitle('Monthly Revenue Trend');

      const monthlyData = data.salesByMonth.map(m => [
        m.month,
        formatNumber(m.sales),
        formatCurrency(m.revenue),
        formatCurrency(m.sales > 0 ? m.revenue / m.sales : 0)
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Month', 'Sales', 'Revenue', 'Avg Order']],
        body: monthlyData,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    }
  }

  private addInventoryReport(): void {
    const { data, formatCurrency, formatNumber } = this.config;

    // Inventory summary
    this.addSectionTitle('Inventory Summary');

    const inventoryData = [
      ['Total Products', formatNumber(data.inventoryStatus?.totalItems || data.totalProducts)],
      ['Low Stock Items', formatNumber(data.inventoryStatus?.lowStock || 0)],
      ['Out of Stock Items', formatNumber(data.inventoryStatus?.outOfStock || 0)],
      ['Total Inventory Value', formatCurrency(data.inventoryStatus?.totalValue || 0)],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: inventoryData,
      theme: 'grid',
      headStyles: {
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { halign: 'right' },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
    this.checkPageBreak();

    // Stock status
    if (data.productPerformance && data.productPerformance.length > 0) {
      this.addSectionTitle('Product Stock Status');

      const stockData = data.productPerformance
        .sort((a, b) => a.stock - b.stock) // Sort by stock level
        .slice(0, 30) // Top 30
        .map((p, i) => {
          let status = 'Normal';
          if (p.stock === 0) status = 'Out of Stock';
          else if (p.stock <= 5) status = 'Critical';
          else if (p.stock <= 10) status = 'Low';

          return [
            `${i + 1}`,
            p.productName,
            p.category,
            formatNumber(p.stock),
            status,
            formatCurrency(p.revenue)
          ];
        });

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['#', 'Product', 'Category', 'Stock', 'Status', 'Revenue']],
        body: stockData,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          3: { halign: 'right', cellWidth: 20 },
          4: { halign: 'center', cellWidth: 25 },
          5: { halign: 'right', cellWidth: 30 },
        },
        didParseCell: (data: any) => {
          // Color code status column
          if (data.column.index === 4 && data.section === 'body') {
            const status = data.cell.raw;
            if (status === 'Out of Stock') {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            } else if (status === 'Critical') {
              data.cell.styles.textColor = [234, 88, 12];
              data.cell.styles.fontStyle = 'bold';
            } else if (status === 'Low') {
              data.cell.styles.textColor = [234, 179, 8];
            }
          }
        },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    }
  }

  private addSectionTitle(title: string): void {
    this.checkPageBreak(20);

    this.doc.setFontSize(14);
    this.doc.setTextColor(...this.primaryColor);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 8;
  }

  private checkPageBreak(requiredSpace: number = 40): void {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  private addFooters(): void {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);

      // Footer line
      this.doc.setDrawColor(...this.secondaryColor);
      this.doc.setLineWidth(0.2);
      this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);

      // Footer text
      this.doc.setFontSize(8);
      this.doc.setTextColor(...this.secondaryColor);
      this.doc.setFont('helvetica', 'normal');

      // Left: Company name
      this.doc.text(this.config.company.name, this.margin, this.pageHeight - 10);

      // Center: Report title
      const centerText = `${this.config.reportTitle} - Confidential`;
      const centerX = this.pageWidth / 2;
      this.doc.text(centerText, centerX, this.pageHeight - 10, { align: 'center' });

      // Right: Page number
      this.doc.text(`Page ${i} of ${pageCount}`, this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
    }
  }

  private addExecutiveSummary(): void {
    const { data, formatCurrency, formatNumber } = this.config;

    // Create an executive summary box
    this.doc.setFillColor(248, 250, 252); // Light gray background
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (this.margin * 2), 35, 'F');

    // Border
    this.doc.setDrawColor(...this.primaryColor);
    this.doc.setLineWidth(0.3);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (this.margin * 2), 35);

    const boxY = this.currentY + 7;

    // Title
    this.doc.setFontSize(12);
    this.doc.setTextColor(...this.primaryColor);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Executive Summary', this.margin + 5, boxY);

    // Summary text
    this.doc.setFontSize(9);
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'normal');

    const avgOrderValue = data.totalSales > 0 ? data.totalRevenue / data.totalSales : 0;
    const growthText = data.revenueGrowth >= 0 ? 'increased' : 'decreased';
    const summaryLines = [
      `During this period, your business generated ${formatCurrency(data.totalRevenue)} in total revenue from ${formatNumber(data.totalSales)} transactions,`,
      `with an average order value of ${formatCurrency(avgOrderValue)}. Revenue ${growthText} by ${Math.abs(data.revenueGrowth).toFixed(1)}% compared to the previous period.`,
      `You served ${formatNumber(data.totalCustomers)} customers, with your top ${Math.min(5, data.topProducts.length)} products accounting for a significant portion of sales.`
    ];

    let textY = boxY + 7;
    summaryLines.forEach(line => {
      const lines = this.doc.splitTextToSize(line, this.pageWidth - (this.margin * 2) - 10);
      this.doc.text(lines, this.margin + 5, textY);
      textY += lines.length * 4;
    });

    this.currentY += 40;
    this.checkPageBreak();
  }

  private addCustomerCharts(): void {
    const { data } = this.config;

    // Add a simple visualization for customer segments
    if (data.customerSegments && data.customerSegments.length > 0) {
      this.addSectionTitle('Customer Segments (Visual)');

      const total = data.customerSegments.reduce((sum, s) => sum + s.totalSpent, 0);

      data.customerSegments.forEach((segment, index) => {
        const percentage = (segment.totalSpent / total) * 100;
        const barWidth = (percentage / 100) * 120; // Max 120mm bar width
        const y = this.currentY + (index * 10);

        // Segment name
        this.doc.setFontSize(9);
        this.doc.setTextColor(...this.secondaryColor);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(segment.segment, this.margin, y);

        // Bar
        this.doc.setFillColor(...this.primaryColor);
        this.doc.rect(this.margin + 40, y - 3, barWidth, 4, 'F');

        // Percentage
        this.doc.setTextColor(0, 0, 0);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(`${percentage.toFixed(1)}%`, this.pageWidth - this.margin, y, { align: 'right' });
      });

      this.currentY += data.customerSegments.length * 10 + 10;
      this.checkPageBreak();
    }
  }

  private addProductCharts(): void {
    const { data } = this.config;

    // Add category breakdown visualization
    if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
      this.addSectionTitle('Category Revenue Distribution (Visual)');

      const categories = data.categoryBreakdown.slice(0, 6);
      const maxRevenue = Math.max(...categories.map(c => c.revenue));

      categories.forEach((category, index) => {
        const barWidth = (category.revenue / maxRevenue) * 120;
        const y = this.currentY + (index * 10);

        // Category name
        this.doc.setFontSize(9);
        this.doc.setTextColor(...this.secondaryColor);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(category.category.substring(0, 20), this.margin, y);

        // Bar
        this.doc.setFillColor(...this.primaryColor);
        this.doc.rect(this.margin + 50, y - 3, barWidth, 4, 'F');

        // Revenue
        this.doc.setTextColor(0, 0, 0);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(this.config.formatCurrency(category.revenue), this.pageWidth - this.margin, y, { align: 'right' });
      });

      this.currentY += categories.length * 10 + 10;
      this.checkPageBreak();
    }
  }

  private addMonthlyTrendChart(): void {
    const { data } = this.config;

    if (data.salesByMonth && data.salesByMonth.length > 0) {
      this.addSectionTitle('Monthly Revenue Trend (Visual)');

      const months = data.salesByMonth.slice(-6); // Last 6 months
      const maxRevenue = Math.max(...months.map(m => m.revenue));

      const chartWidth = this.pageWidth - (this.margin * 2);
      const chartHeight = 40;
      const barSpacing = chartWidth / months.length;
      const barWidth = barSpacing * 0.7;

      // Draw bars
      months.forEach((month, index) => {
        const barHeight = (month.revenue / maxRevenue) * chartHeight;
        const x = this.margin + (index * barSpacing) + (barSpacing - barWidth) / 2;
        const y = this.currentY + chartHeight - barHeight;

        // Bar
        this.doc.setFillColor(...this.primaryColor);
        this.doc.rect(x, y, barWidth, barHeight, 'F');

        // Month label
        this.doc.setFontSize(7);
        this.doc.setTextColor(...this.secondaryColor);
        this.doc.text(month.month.substring(0, 3), x + barWidth / 2, this.currentY + chartHeight + 5, { align: 'center' });

        // Value on top of bar
        this.doc.setFontSize(7);
        this.doc.setTextColor(0, 0, 0);
        this.doc.setFont('helvetica', 'bold');
        const shortValue = month.revenue >= 1000 ? `${(month.revenue / 1000).toFixed(1)}k` : month.revenue.toFixed(0);
        this.doc.text(shortValue, x + barWidth / 2, y - 2, { align: 'center' });
      });

      this.currentY += chartHeight + 15;
      this.checkPageBreak();
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  download(filename?: string): void {
    const defaultFilename = `${this.config.reportType}-report-${Date.now()}.pdf`;
    this.doc.save(filename || defaultFilename);
  }

  getBlob(): Blob {
    return this.doc.output('blob');
  }

  getDataUri(): string {
    return this.doc.output('datauristring');
  }
}

// Export helper function
export async function generateReportPDF(config: ReportConfig): Promise<ReportsPDFGenerator> {
  const generator = new ReportsPDFGenerator(config);
  await generator.generate();
  return generator;
}

