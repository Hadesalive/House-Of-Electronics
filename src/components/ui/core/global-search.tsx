'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, CubeIcon, UserIcon, CurrencyDollarIcon, DocumentTextIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { productService, customerService, salesService } from '@/lib/services';
import { Product, Customer, Sale } from '@/lib/types/core';

interface SearchResult {
  id: string;
  type: 'product' | 'customer' | 'sale' | 'invoice' | 'order';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  url: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const allResults: SearchResult[] = [];

    try {
      // Search Products
      const productsResult = await productService.searchProducts(searchQuery);
      if (productsResult.success && productsResult.data) {
        productsResult.data.slice(0, 3).forEach(product => {
          allResults.push({
            id: product.id,
            type: 'product',
            title: product.name,
            subtitle: product.sku || product.category || `Stock: ${product.stock}`,
            icon: <CubeIcon className="h-4 w-4" />,
            url: `/products/${product.id}`,
          });
        });
      }

      // Search Customers
      const customersResult = await customerService.searchCustomers(searchQuery);
      if (customersResult.success && customersResult.data) {
        customersResult.data.slice(0, 3).forEach(customer => {
          allResults.push({
            id: customer.id,
            type: 'customer',
            title: customer.name,
            subtitle: customer.email || customer.phone,
            icon: <UserIcon className="h-4 w-4" />,
            url: `/customers/${customer.id}`,
          });
        });
      }

      // Search Sales
      const salesResult = await salesService.searchSales(searchQuery);
      if (salesResult.success && salesResult.data) {
        salesResult.data.slice(0, 3).forEach(sale => {
          allResults.push({
            id: sale.id,
            type: 'sale',
            title: `Sale ${sale.id.substring(0, 8)}`,
            subtitle: sale.customerName || sale.paymentMethod,
            icon: <CurrencyDollarIcon className="h-4 w-4" />,
            url: `/sales/${sale.id}`,
          });
        });
      }

      setResults(allResults.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleResultClick(results[selectedIndex]);
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'product': return 'Product';
      case 'customer': return 'Customer';
      case 'sale': return 'Sale';
      case 'invoice': return 'Invoice';
      case 'order': return 'Order';
      default: return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <MagnifyingGlassIcon 
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
          style={{ color: 'var(--muted-foreground)' }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products, customers, sales..."
          className="h-9 w-40 md:w-56 rounded-lg pl-9 pr-8 text-sm border transition-all focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: isOpen ? 'var(--accent)' : 'var(--border)',
            color: 'var(--foreground)',
            '--tw-ring-color': 'var(--accent)',
            '--tw-ring-width': '2px',
          } as React.CSSProperties & { '--tw-ring-color'?: string; '--tw-ring-width'?: string }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
            style={{ 
              color: 'var(--muted-foreground)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        )}
        {!query && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
              ⌘K
            </kbd>
          </div>
        )}
      </div>

      {isOpen && (
        <div
          className="absolute left-0 top-11 w-96 max-h-[400px] overflow-hidden rounded-xl shadow-lg z-50 flex flex-col"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            animation: 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {query ? (
            <>
              {isSearching ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-2" style={{ borderColor: 'var(--accent)' }}></div>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div 
                  className="search-results-scroll"
                  style={{ 
                    maxHeight: '380px',
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  {results.map((result, index) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full px-4 py-3.5 text-left flex items-start gap-3 transition-colors"
                      style={{
                        backgroundColor: index === selectedIndex ? 'var(--muted)' : 'transparent',
                        borderBottom: index < results.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (index !== selectedIndex) {
                          e.currentTarget.style.backgroundColor = 'var(--muted)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index !== selectedIndex) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div className="flex-shrink-0 mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                        {result.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                            {result.title}
                          </p>
                          <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                            {getTypeLabel(result.type)}
                          </span>
                        </div>
                        {result.subtitle && (
                          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--muted-foreground)' }} />
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    No results found
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="p-6">
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--foreground)' }}>
                Quick Search
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  <CubeIcon className="h-4 w-4" />
                  <span>Search products by name, SKU, or category</span>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  <UserIcon className="h-4 w-4" />
                  <span>Search customers by name, email, or phone</span>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  <CurrencyDollarIcon className="h-4 w-4" />
                  <span>Search sales by ID or customer name</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                  Press <kbd className="px-1 py-0.5 rounded border" style={{ borderColor: 'var(--border)' }}>⌘K</kbd> or <kbd className="px-1 py-0.5 rounded border" style={{ borderColor: 'var(--border)' }}>Ctrl+K</kbd> to open search
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .search-results-scroll {
          scrollbar-width: none !important; /* Firefox */
          -ms-overflow-style: none !important; /* IE and Edge */
        }
        .search-results-scroll::-webkit-scrollbar {
          display: none !important; /* Chrome, Safari, Opera */
          width: 0 !important;
          height: 0 !important;
        }
        input[type="text"]::placeholder {
          color: var(--muted-foreground);
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}

