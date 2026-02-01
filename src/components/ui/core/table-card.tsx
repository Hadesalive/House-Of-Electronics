"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

interface TableCardProps {
  title?: string;
  columns: TableColumn[];
  data: Record<string, React.ReactNode>[];
  className?: string;
  headerActions?: React.ReactNode;
}

export function TableCard({
  title,
  columns,
  data,
  className = "",
  headerActions
}: TableCardProps) {
  return (
    <div 
      className={cn(
        "rounded-xl overflow-hidden",
        className
      )}
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      {(title || headerActions) && (
        <div className="p-5 font-medium flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          {title && (
            <span style={{ color: 'var(--foreground)' }}>{title}</span>
          )}
          {headerActions && (
            <div className="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-4 text-left text-sm font-medium"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 text-sm"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {data.length === 0 && (
        <div className="p-12 text-center">
          <div 
            className="text-sm"
            style={{ color: 'var(--muted-foreground)' }}
          >
            No data available
          </div>
        </div>
      )}
    </div>
  );
}
