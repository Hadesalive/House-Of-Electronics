import React from "react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState, LoadingState } from "./empty-state";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

export function ChartCard({ 
  title, 
  children, 
  className = "", 
  headerActions,
  loading = false,
  empty = false,
  emptyTitle,
  emptyDescription,
  emptyAction
}: ChartCardProps) {
  return (
    <div className={cn("p-4 rounded-xl overflow-hidden", className)} style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{title}</h3>
        {headerActions && <div>{headerActions}</div>}
      </div>
      {loading ? (
        <LoadingState size="md" />
      ) : empty ? (
        <EmptyState
          title={emptyTitle || "No data available"}
          description={emptyDescription}
          action={emptyAction}
          size="md"
        />
      ) : (
        <div className="overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}
