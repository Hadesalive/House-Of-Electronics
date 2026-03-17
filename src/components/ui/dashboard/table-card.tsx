"use client";

import React from "react";
import { ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { EmptyState, LoadingState } from "./empty-state";

interface TableColumn {
  key: string;
  label: string;
  className?: string;
  sortable?: boolean;
}

interface TableRow {
  [key: string]: string | number | ReactNode;
}

interface TableCardProps {
  title: string;
  columns: TableColumn[];
  data: TableRow[];
  className?: string;
  headerActions?: ReactNode;
  itemsPerPage?: number;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

export function PaginatedTableCard({ 
  title, 
  columns, 
  data, 
  className = "", 
  headerActions, 
  itemsPerPage = 10,
  loading = false,
  empty = false,
  emptyTitle,
  emptyDescription,
  emptyAction
}: TableCardProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Reset to page 1 when data changes (search/filter)
  useEffect(() => { setCurrentPage(1); }, [data.length]);

  // Sort data based on current sort settings
  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    // Handle different data types
    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);
  
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };
  
  return (
    <div className={cn("rounded-xl overflow-hidden", className)} style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="p-4 font-medium flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-sm" style={{ color: 'var(--foreground)' }}>{title}</span>
        {headerActions && <div>{headerActions}</div>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}>
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  className={cn(
                    "px-4 py-2.5 select-none text-xs font-medium",
                    column.sortable !== false && "cursor-pointer hover:bg-[var(--muted)] transition-colors",
                    column.className
                  )}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{column.label}</span>
                    {column.sortable !== false && (
                      <div className="flex flex-col">
                        <ChevronUpIcon 
                          className={cn(
                            "h-2.5 w-2.5 -mb-0.5 transition-colors",
                            sortColumn === column.key && sortDirection === 'asc' 
                              ? "text-[var(--accent)]" 
                              : "var(--muted-foreground)"
                          )}
                          style={{ color: sortColumn === column.key && sortDirection === 'asc' ? 'var(--accent)' : 'var(--muted-foreground)' }}
                        />
                        <ChevronDownIcon 
                          className={cn(
                            "h-2.5 w-2.5 transition-colors",
                            sortColumn === column.key && sortDirection === 'desc' 
                              ? "text-[var(--accent)]" 
                              : "var(--muted-foreground)"
                          )}
                          style={{ color: sortColumn === column.key && sortDirection === 'desc' ? 'var(--accent)' : 'var(--muted-foreground)' }}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8">
                  <LoadingState size="sm" />
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8">
                  <EmptyState
                    title={emptyTitle || "No data available"}
                    description={emptyDescription}
                    action={emptyAction}
                    size="sm"
                  />
                </td>
              </tr>
            ) : (
              currentData.map((row, index) => (
                <tr 
                  key={index} 
                  className="hover:bg-[var(--muted)] transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-4 py-2.5 text-xs", column.className)} style={{ color: 'var(--foreground)' }}>
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 flex-wrap gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Showing {startIndex + 1}–{Math.min(endIndex, sortedData.length)} of {sortedData.length}
          </div>
          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--muted)] transition-colors"
              style={{ color: 'var(--foreground)', border: '1px solid var(--border)' }}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>

            {/* Windowed page buttons */}
            {(() => {
              const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
              const delta = 2;
              const left = currentPage - delta;
              const right = currentPage + delta;

              // Always show page 1
              pages.push(1);

              if (left > 2) pages.push('ellipsis-start');

              for (let i = Math.max(2, left); i <= Math.min(totalPages - 1, right); i++) {
                pages.push(i);
              }

              if (right < totalPages - 1) pages.push('ellipsis-end');

              // Always show last page
              if (totalPages > 1) pages.push(totalPages);

              return pages.map((page, idx) => {
                if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                  return (
                    <span key={page} className="px-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>…</span>
                  );
                }
                const isActive = currentPage === page;
                return (
                  <button
                    key={`${page}-${idx}`}
                    onClick={() => goToPage(page)}
                    className="min-w-[28px] px-2 py-1 text-xs rounded-md transition-colors"
                    style={{
                      backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                      color: isActive ? 'white' : 'var(--foreground)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {page}
                  </button>
                );
              });
            })()}

            {/* Next */}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--muted)] transition-colors"
              style={{ color: 'var(--foreground)', border: '1px solid var(--border)' }}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
