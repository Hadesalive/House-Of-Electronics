import React from "react";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
}

export function FormCard({ 
  title, 
  description, 
  children, 
  className = "", 
  headerActions 
}: FormCardProps) {
  return (
    <div 
      className={cn("rounded-xl p-6", className)} 
      style={{ 
        background: 'var(--card)', 
        border: '1px solid var(--border)' 
      }}
    >
      {(title || description || headerActions) && (
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              {title && (
                <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  {description}
                </p>
              )}
            </div>
            {headerActions && <div>{headerActions}</div>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
