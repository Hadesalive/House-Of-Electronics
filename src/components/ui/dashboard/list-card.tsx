"use client";

import React from "react";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { EmptyState, LoadingState } from "./empty-state";

interface ListItem {
  id: string;
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
}

interface ListCardProps {
  title: string;
  items: ListItem[];
  className?: string;
  headerActions?: ReactNode;
  itemsPerPage?: number;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

export function ListCard({ 
  title, 
  items, 
  className = "", 
  headerActions, 
  itemsPerPage = 10,
  loading = false,
  empty = false,
  emptyTitle,
  emptyDescription,
  emptyAction
}: ListCardProps) {
  // For top customers, show all items without pagination
  // For other lists, use pagination if itemsPerPage is specified
  const shouldPaginate = itemsPerPage > 0 && items.length > itemsPerPage;
  
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = shouldPaginate ? items.slice(startIndex, endIndex) : items;
  
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  
  return (
    <div className={cn("rounded-xl", className)} style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{title}</h3>
          {headerActions && <div>{headerActions}</div>}
        </div>
        {loading ? (
          <LoadingState size="sm" />
        ) : empty ? (
          <EmptyState
            title={emptyTitle || "No data available"}
            description={emptyDescription}
            action={emptyAction}
            size="sm"
          />
        ) : (
          <ul className="space-y-2 text-xs">
            {currentItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2.5">
                  {item.icon || (
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                  )}
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>{item.label}</span>
                </span>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Pagination - only show if pagination is enabled and there are multiple pages */}
      {shouldPaginate && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Showing {startIndex + 1} to {Math.min(endIndex, items.length)} of {items.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                color: 'var(--foreground)',
                border: '1px solid var(--border)'
              }}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    currentPage === page 
                      ? '' 
                      : 'hover:bg-[var(--muted)]'
                  }`}
                  style={{
                    backgroundColor: currentPage === page ? 'var(--accent)' : 'transparent',
                    color: currentPage === page ? 'var(--accent-contrast)' : 'var(--foreground)',
                    border: '1px solid var(--border)'
                  }}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                color: 'var(--foreground)',
                border: '1px solid var(--border)'
              }}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
