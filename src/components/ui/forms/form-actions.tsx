import React from "react";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormActionsProps {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right" | "between";
}

export function FormActions({ 
  children, 
  className = "",
  align = "right"
}: FormActionsProps) {
  const alignClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between"
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 pt-6 border-t",
        alignClasses[align],
        className
      )}
      style={{ borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  );
}
