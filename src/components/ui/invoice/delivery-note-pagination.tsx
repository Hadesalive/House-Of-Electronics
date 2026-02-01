/**
 * Delivery Note Pagination Utilities
 * 
 * Specialized pagination logic for delivery notes that accounts for:
 * - Signature section requirements
 * - Delivery confirmation space
 * - No financial totals (delivery notes don't need totals page)
 * - Optimized for delivery note specific layouts
 */

export interface DeliveryNoteItem {
  id: string;
  description: string;
  itemDescription?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface DeliveryNotePage {
  pageNumber: number;
  totalPages: number;
  items: DeliveryNoteItem[];
  isFirstPage: boolean;
  isLastPage: boolean;
  itemsRange: {
    start: number;
    end: number;
  };
}

export interface DeliveryNotePaginationConfig {
  /** Template type for capacity calculations */
  templateType: 'compact' | 'standard' | 'detailed';
  /** First page capacity (accounts for header and company info) */
  firstPageCapacity: number;
  /** Last page capacity (accounts for signature section) */
  lastPageCapacity: number;
  /** Items per page for middle pages */
  itemsPerPage: number;
  /** Whether to show page numbers */
  showPageNumbers?: boolean;
  /** Whether to show "Continued..." on overflow pages */
  showContinuedLabel?: boolean;
}

/**
 * Default pagination configuration for delivery notes
 */
export const getDeliveryNotePaginationConfig = (templateType: 'compact' | 'standard' | 'detailed' = 'compact'): DeliveryNotePaginationConfig => {
  const baseConfig = {
    templateType,
    showPageNumbers: true,
    showContinuedLabel: true
  };

  switch (templateType) {
    case 'compact':
      return {
        ...baseConfig,
        // Space calculation: A4=297mm, padding=24mm, available=273mm
        // First page: header~93mm + table overhead~17mm = 110mm used, 163mm for rows
        //   Row height ~14mm → 163/14 = 11.6 items → 11 items
        // Middle pages: overhead~21mm = 21mm used, 252mm for rows → 252/14 = 18 items
        // Last page: signature~93mm + overhead~17mm = 110mm used, 163mm for rows → 11 items
        // Capacity = items / itemsPerPage → 11/18 = 0.61, 18/18 = 1.0
        firstPageCapacity: 0.61,  // 11 items (11/18 = 61%)
        lastPageCapacity: 0.61,   // 11 items (11/18 = 61%)
        itemsPerPage: 18          // Middle pages: 18 items (100%)
      };
    
    case 'standard':
      return {
        ...baseConfig,
        // Pro Corporate template - same calculations apply
        // First: 11 items, Middle: 18 items, Last: 11 items
        firstPageCapacity: 0.61,  // 11 items (11/18 = 61%)
        lastPageCapacity: 0.61,   // 11 items (11/18 = 61%)
        itemsPerPage: 18          // Middle pages: 18 items (100%)
      };
    
    case 'detailed':
      return {
        ...baseConfig,
        // Smaller rows, more items per page
        // First: ~13 items, Middle: ~20 items, Last: ~13 items
        firstPageCapacity: 0.65,  // 13 items (13/20 = 65%)
        lastPageCapacity: 0.65,   // 13 items (13/20 = 65%)
        itemsPerPage: 20          // Middle pages: 20 items (100%)
      };
    
    default:
      return {
        ...baseConfig,
        firstPageCapacity: 0.61,
        lastPageCapacity: 0.61,
        itemsPerPage: 18
      };
  }
};

/**
 * Calculate optimal pagination for delivery note items
 * Accounts for signature section space requirements
 */
export function paginateDeliveryNoteItems(
  items: DeliveryNoteItem[],
  config: DeliveryNotePaginationConfig
): DeliveryNotePage[] {
  if (items.length === 0) {
    return [];
  }

  const pages: DeliveryNotePage[] = [];
  let itemIndex = 0;
  
  // Calculate actual capacities
  const firstPageCapacity = Math.floor(config.itemsPerPage * config.firstPageCapacity);
  const lastPageCapacity = Math.floor(config.itemsPerPage * config.lastPageCapacity);
  const middlePageCapacity = config.itemsPerPage;
  
  // Calculate total pages needed correctly
  // This is a two-pass approach: first calculate, then paginate
  let remainingItems = items.length;
  let calculatedTotalPages = 0;
  
  if (remainingItems <= firstPageCapacity) {
    // All items fit on first page
    calculatedTotalPages = 1;
  } else {
    // Reserve first page
    remainingItems -= firstPageCapacity;
    calculatedTotalPages = 1;
    
    // Now calculate remaining pages
    // We always need a last page for signature (with reduced capacity)
    if (remainingItems <= lastPageCapacity) {
      // Remaining fits on last page
      calculatedTotalPages += 1;
    } else {
      // Reserve last page capacity
      remainingItems -= lastPageCapacity;
      calculatedTotalPages += 1; // Last page
      
      // Calculate middle pages for remaining items
      if (remainingItems > 0) {
        calculatedTotalPages += Math.ceil(remainingItems / middlePageCapacity);
      }
    }
  }
  
  // Now actually paginate
  while (itemIndex < items.length) {
    const currentPage = pages.length + 1;
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === calculatedTotalPages;
    const remaining = items.length - itemIndex;
    
    // Calculate items for this page based on position
    let itemsForThisPage: number;
    
    if (isFirstPage) {
      // First page has header, so fewer items
      itemsForThisPage = Math.min(firstPageCapacity, remaining);
    } else if (isLastPage) {
      // Last page needs space for signature section
      // Take all remaining items (should fit based on our calculation)
      itemsForThisPage = remaining;
      
      // Safety check: ensure we don't exceed lastPageCapacity
      if (itemsForThisPage > lastPageCapacity) {
        // This means our calculation was off - fix it
        itemsForThisPage = lastPageCapacity;
      }
    } else {
      // Middle page
      // We need to leave enough items for the last page
      // Calculate how many items will be left after this page
      const itemsAfterThisPage = remaining - middlePageCapacity;
      
      if (itemsAfterThisPage <= lastPageCapacity) {
        // We can fill this middle page fully
        itemsForThisPage = Math.min(middlePageCapacity, remaining);
      } else {
        // We need to ensure last page gets at most lastPageCapacity
        // So take middlePageCapacity (which is safe)
        itemsForThisPage = middlePageCapacity;
      }
    }
    
    // Final safety check
    itemsForThisPage = Math.min(itemsForThisPage, remaining);
    
    if (itemsForThisPage <= 0) break;
    
    const pageItems = items.slice(itemIndex, itemIndex + itemsForThisPage);
    
    pages.push({
      pageNumber: currentPage,
      totalPages: calculatedTotalPages,
      items: pageItems,
      isFirstPage,
      isLastPage,
      itemsRange: {
        start: itemIndex + 1,
        end: itemIndex + pageItems.length
      }
    });
    
    itemIndex += itemsForThisPage;
  }
  
  // Update totalPages to actual number of pages created (in case calculation was off)
  const actualTotalPages = pages.length;
  if (actualTotalPages !== calculatedTotalPages) {
    // Update all pages with correct totalPages
    pages.forEach(page => {
      page.totalPages = actualTotalPages;
      page.isLastPage = page.pageNumber === actualTotalPages;
    });
  }
  
  return pages;
}

/**
 * Check if delivery note needs multiple pages
 * Delivery notes never need separate totals page (they have signature section instead)
 */
export function deliveryNoteNeedsMultiplePages(pages: DeliveryNotePage[]): boolean {
  return pages.length > 1;
}

/**
 * Get delivery note specific page title
 */
export function getDeliveryNotePageTitle(pageNumber: number, totalPages: number): string {
  if (totalPages === 1) {
    return 'Delivery Note';
  }
  
  if (pageNumber === totalPages) {
    return `Delivery Note - Page ${pageNumber} of ${totalPages} (Signature Page)`;
  }
  
  return `Delivery Note - Page ${pageNumber} of ${totalPages}`;
}

/**
 * Get delivery note pagination info for display
 */
export function getDeliveryNotePaginationInfo(pages: DeliveryNotePage[]): {
  totalPages: number;
  totalItems: number;
  hasSignatureSection: boolean;
  message: string;
} {
  const totalItems = pages.reduce((sum, page) => sum + page.items.length, 0);
  const hasSignatureSection = pages.length > 0 && pages[pages.length - 1].isLastPage;
  
  let message = `This delivery note has ${pages.length} page${pages.length > 1 ? 's' : ''} (${totalItems} items)`;
  
  if (hasSignatureSection && pages.length > 1) {
    message += ' with signature section on last page';
  }
  
  return {
    totalPages: pages.length,
    totalItems,
    hasSignatureSection,
    message
  };
}

/**
 * Delivery note specific print styles
 * Ensures proper spacing for signature sections
 */
export const deliveryNotePrintStyles = `
  @media print {
    /* Delivery note specific optimizations */
    .delivery-note-page {
      /* Extra space for signature section */
      padding-bottom: 12mm !important;
    }
    
    /* Ensure signature section doesn't break across pages */
    .delivery-signature-section {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin-top: 8mm !important;
    }
    
    /* Signature lines should stay together */
    .signature-lines {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    /* Delivery confirmation section */
    .delivery-confirmation {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin-bottom: 6mm !important;
    }
  }
`;

/**
 * Delivery note page break component
 * Ensures proper page breaks for delivery notes
 */
export function DeliveryNotePageBreak() {
  return (
    <div 
      className="delivery-note-page-break" 
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
 * Delivery note items range indicator
 * Shows which items are on the current page
 */
export function DeliveryNoteItemsRange({ 
  page, 
  showContinued = true 
}: { 
  page: DeliveryNotePage; 
  showContinued?: boolean; 
}) {
  if (page.totalPages === 1) {
    return null;
  }
  
  return (
    <div className="delivery-note-range-indicator text-xs text-gray-500 text-center py-2">
      {page.isFirstPage && showContinued && (
        <span>Items {page.itemsRange.start}-{page.itemsRange.end} of {page.itemsRange.end} • Continued on next page</span>
      )}
      {!page.isFirstPage && !page.isLastPage && (
        <span>Items {page.itemsRange.start}-{page.itemsRange.end} of {page.itemsRange.end} • Continued from previous page</span>
      )}
      {page.isLastPage && page.totalPages > 1 && (
        <span>Items {page.itemsRange.start}-{page.itemsRange.end} of {page.itemsRange.end} • Signature section below</span>
      )}
    </div>
  );
}
