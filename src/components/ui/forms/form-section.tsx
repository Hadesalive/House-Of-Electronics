import React from "react";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function FormSection({ 
  title, 
  description, 
  children, 
  className = "",
  columns = 1
}: FormSectionProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  };

  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div>
          {title && (
            <h3 className="text-base font-medium" style={{ color: 'var(--foreground)' }}>
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {description}
            </p>
          )}
        </div>
      )}
      <div className={cn("grid gap-4", gridCols[columns])}>
        {children}
      </div>
    </div>
  );
}
