/**
 * Multi-Page Invoice Utilities
 * 
 * Industry standard approach for handling invoices with many items:
 * - Automatic page breaks based on A4 paper size
 * - Repeated table headers on each page
 * - Page numbers and continuation indicators
 * - Totals only on the last page
 */

export interface InvoiceItem {
  id: string;
  description: string;
  itemDescription?: string; // Additional item-specific description
  quantity: number;
  rate: number;
  amount: number;
}

export interface PageConfig {
  /** Maximum number of items per page (default: 12 for A4) */
  itemsPerPage?: number;
  /** First page capacity multiplier (default: 0.85 - accounts for header space) */
  firstPageCapacity?: number;
  /** Last page capacity multiplier (default: 0.75 - accounts for totals/footer space) */
  lastPageCapacity?: number;
  /** Threshold for separate totals page (default: 8 items) */
  separateTotalsThreshold?: number;
  /** Whether to show page numbers (default: true) */
  showPageNumbers?: boolean;
  /** Whether to show "Continued..." on overflow pages (default: true) */
  showContinuedLabel?: boolean;
  /** Template type for dynamic calculations */
  templateType?: 'compact' | 'standard' | 'detailed';
}

export interface InvoicePage {
  pageNumber: number;
  totalPages: number;
  items: InvoiceItem[];
  isFirstPage: boolean;
  isLastPage: boolean;
  itemsRange: {
    start: number; // 1-based index for display
    end: number;   // 1-based index for display
  };
}

/**
 * Split invoice items into pages for multi-page rendering
 *
 * Smart pagination that accounts for different page layouts:
 * - First page: Has header + payment tracking, needs more space
 * - Middle pages: Full content pages with just items
 * - Last page: Has totals + footer, needs space for them
 */
export function paginateInvoiceItems(
  items: InvoiceItem[],
  config: PageConfig = {}
): InvoicePage[] {
  const {
    itemsPerPage,
    firstPageCapacity = 0.85,
    lastPageCapacity = 0.75,
    templateType = 'standard'
  } = config;

  if (items.length === 0) {
    // Return single empty page
    return [{
      pageNumber: 1,
      totalPages: 1,
      items: [],
      isFirstPage: true,
      isLastPage: true,
      itemsRange: { start: 0, end: 0 }
    }];
  }

  // Calculate dynamic items per page if not provided
  const dynamicItemsPerPage = itemsPerPage || calculateDynamicItemsPerPage(items, templateType);
  
  // Get dynamic capacities based on template type
  const dynamicCapacities = getDynamicPageCapacities(templateType);
  const finalFirstPageCapacity = firstPageCapacity !== 0.85 ? firstPageCapacity : dynamicCapacities.firstPageCapacity;
  const finalLastPageCapacity = lastPageCapacity !== 0.75 ? lastPageCapacity : dynamicCapacities.lastPageCapacity;

  // Define capacity for different page types using dynamic values
  const firstPageItems = Math.floor(dynamicItemsPerPage * finalFirstPageCapacity);
  const middlePageItems = dynamicItemsPerPage; // Full capacity for middle pages
  const lastPageItems = Math.floor(dynamicItemsPerPage * finalLastPageCapacity);

  // If items fit on one page (single page case)
  if (items.length <= firstPageItems + lastPageItems) {
    // Try to fit everything on first page if possible
    if (items.length <= firstPageItems) {
      return [{
        pageNumber: 1,
        totalPages: 1,
        items: [...items],
        isFirstPage: true,
        isLastPage: true,
        itemsRange: { start: 1, end: items.length }
      }];
    }
    
    // Split between first and last page
    const firstPageItemsCount = firstPageItems;
    
    return [
      {
        pageNumber: 1,
        totalPages: 2,
        items: items.slice(0, firstPageItemsCount),
        isFirstPage: true,
        isLastPage: false,
        itemsRange: { start: 1, end: firstPageItemsCount }
      },
      {
        pageNumber: 2,
        totalPages: 2,
        items: items.slice(firstPageItemsCount),
        isFirstPage: false,
        isLastPage: true,
        itemsRange: { start: firstPageItemsCount + 1, end: items.length }
      }
    ];
  }

  // Multi-page case: Calculate pages needed
  const pages: InvoicePage[] = [];
  let itemIndex = 0;
  const totalItems = items.length;

  // First page (with header and payment tracking)
  const firstPageCount = Math.min(firstPageItems, totalItems);
  if (firstPageCount > 0) {
    pages.push({
      pageNumber: 1,
      totalPages: 0, // Will be calculated later
      items: items.slice(0, firstPageCount),
      isFirstPage: true,
      isLastPage: firstPageCount === totalItems,
      itemsRange: { start: 1, end: firstPageCount }
    });
    itemIndex = firstPageCount;
  }

  // If all items fit on first page, we're done
  if (itemIndex >= totalItems) {
    pages[0].totalPages = 1;
    return pages;
  }

  // Calculate remaining items after first page
  let remainingItems = totalItems - itemIndex;

  // Middle pages (full capacity) - only create if we have enough items left for last page
  while (remainingItems > lastPageItems) {
    const middlePageCount = Math.min(middlePageItems, remainingItems - lastPageItems);
    // Only create middle page if we can fit at least one item and still have room for last page
    if (middlePageCount > 0 && remainingItems - middlePageCount >= lastPageItems) {
      pages.push({
        pageNumber: pages.length + 1,
        totalPages: 0, // Will be calculated later
        items: items.slice(itemIndex, itemIndex + middlePageCount),
        isFirstPage: false,
        isLastPage: false,
        itemsRange: { start: itemIndex + 1, end: itemIndex + middlePageCount }
      });
      itemIndex += middlePageCount;
      remainingItems -= middlePageCount;
    } else {
      // Not enough items for a proper middle page, break to last page
      break;
    }
  }

  // Last page (with totals and footer) - always create if there are remaining items
  if (remainingItems > 0) {
    pages.push({
      pageNumber: pages.length + 1,
      totalPages: 0, // Will be calculated later
      items: items.slice(itemIndex),
      isFirstPage: false,
      isLastPage: true,
      itemsRange: { start: itemIndex + 1, end: totalItems }
    });
  }

  // Update total pages count for all pages
  const totalPages = pages.length;
  pages.forEach(page => {
    page.totalPages = totalPages;
  });

  return pages;
}

/**
 * Calculate if an invoice will span multiple pages
 */
export function isMultiPageInvoice(itemCount: number, itemsPerPage: number = 12): boolean {
  return itemCount > itemsPerPage;
}

/**
 * Determine if a separate totals page is needed based on pagination results
 */
export function needsSeparateTotalsPage(
  pages: InvoicePage[], 
  threshold?: number,
  templateType: 'compact' | 'standard' | 'detailed' = 'standard'
): boolean {
  if (pages.length === 0) return false;
  
  const lastPage = pages[pages.length - 1];
  const dynamicCapacities = getDynamicPageCapacities(templateType);
  const finalThreshold = threshold || dynamicCapacities.separateTotalsThreshold;
  
  return lastPage.items.length > finalThreshold;
}

/**
 * Get recommended items per page based on template type
 */
export function getRecommendedItemsPerPage(templateType: 'compact' | 'standard' | 'detailed'): number {
  switch (templateType) {
    case 'compact':
      return 25;  // More items, less spacing
    case 'detailed':
      return 15;  // Fewer items, more details/spacing
    case 'standard':
    default:
      return 20;  // Conservative - fits nicely on A4
  }
}

/**
 * Calculate dynamic items per page based on content complexity
 */
export function calculateDynamicItemsPerPage(
  items: InvoiceItem[], 
  templateType: 'compact' | 'standard' | 'detailed' = 'standard'
): number {
  if (items.length === 0) return 20;
  
  // Base capacity by template type
  const baseCapacity = getRecommendedItemsPerPage(templateType);
  
  // Analyze content complexity
  const avgDescriptionLength = items.reduce((sum, item) => 
    sum + item.description.length + (item.itemDescription?.length || 0), 0
  ) / items.length;
  
  // Adjust capacity based on content complexity
  let complexityMultiplier = 1;
  if (avgDescriptionLength > 100) {
    complexityMultiplier = 0.7; // Reduce capacity for long descriptions
  } else if (avgDescriptionLength > 50) {
    complexityMultiplier = 0.85;
  }
  
  return Math.floor(baseCapacity * complexityMultiplier);
}

/**
 * Get dynamic page capacity multipliers based on template characteristics
 */
export function getDynamicPageCapacities(templateType: 'compact' | 'standard' | 'detailed'): {
  firstPageCapacity: number;
  lastPageCapacity: number;
  separateTotalsThreshold: number;
} {
  switch (templateType) {
    case 'compact':
      return {
        firstPageCapacity: 0.9,  // Less header space needed
        lastPageCapacity: 0.85,  // Less footer space needed
        separateTotalsThreshold: 10
      };
    case 'detailed':
      return {
        firstPageCapacity: 0.8,  // More header space needed
        lastPageCapacity: 0.7,   // More footer space needed
        separateTotalsThreshold: 6
      };
    case 'standard':
    default:
      return {
        firstPageCapacity: 0.85, // Standard header space
        lastPageCapacity: 0.75,  // Standard footer space
        separateTotalsThreshold: 8
      };
  }
}

/**
 * Page break component for print media
 * Ensures clean breaks between pages when printing
 */
export function PageBreak() {
  return (
    <div 
      className="page-break" 
      style={{ 
        pageBreakAfter: 'always',
        breakAfter: 'page',
        height: '0',
        overflow: 'hidden'
      }} 
    />
  );
}

/**
 * Page number component - industry standard placement
 */
export function PageNumber({ 
  current, 
  total, 
  className = '' 
}: { 
  current: number; 
  total: number; 
  className?: string;
}) {
  if (total <= 1) return null; // Don't show page numbers for single-page invoices
  
  return (
    <div className={`text-xs text-gray-500 text-center ${className}`}>
      Page {current} of {total}
    </div>
  );
}

/**
 * Continuation label - shown on pages that continue from previous page
 */
export function ContinuationLabel({ 
  className = '' 
}: { 
  className?: string;
}) {
  return (
    <div className={`text-xs text-gray-500 italic ${className}`}>
      (Continued...)
    </div>
  );
}

/**
 * Items range indicator - shows "Items 1-12 of 45"
 */
export function ItemsRangeIndicator({ 
  start, 
  end, 
  total,
  className = '' 
}: { 
  start: number; 
  end: number; 
  total: number;
  className?: string;
}) {
  if (total <= 12) return null; // Don't show for small invoices
  
  return (
    <div className={`text-xs text-gray-600 ${className}`}>
      Items {start}–{end} of {total}
    </div>
  );
}

