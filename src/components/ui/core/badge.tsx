import React from "react";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error" | "info" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function Badge({ 
  variant = "default", 
  size = "md", 
  children, 
  className = "", 
  icon 
}: BadgeProps) {
  const baseStyles = "inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors";
  
  const sizeStyles = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-sm px-3 py-1.5"
  };

  const variantStyles = {
    default: {
      background: "var(--accent)",
      color: "var(--accent-contrast)",
      border: "transparent"
    },
    success: {
      background: "#10b981",
      color: "#ffffff",
      border: "transparent"
    },
    warning: {
      background: "#f59e0b",
      color: "#ffffff",
      border: "transparent"
    },
    error: {
      background: "#ef4444",
      color: "#ffffff",
      border: "transparent"
    },
    info: {
      background: "#3b82f6",
      color: "#ffffff",
      border: "transparent"
    },
    secondary: {
      background: "var(--muted)",
      color: "var(--muted-foreground)",
      border: "transparent"
    },
    outline: {
      background: "transparent",
      color: "var(--foreground)",
      border: "var(--border)"
    }
  };

  const styles = variantStyles[variant];

  return (
    <span 
      className={cn(baseStyles, sizeStyles[size], className)}
      style={{
        backgroundColor: styles.background,
        color: styles.color,
        borderColor: styles.border
      }}
    >
      {icon && (
        <span className="flex-shrink-0">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

// Status Badge for common statuses
interface StatusBadgeProps {
  status: "active" | "inactive" | "pending" | "completed" | "cancelled" | "draft" | "published";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const statusConfig = {
  active: { variant: "success" as const, label: "Active" },
  inactive: { variant: "secondary" as const, label: "Inactive" },
  pending: { variant: "warning" as const, label: "Pending" },
  completed: { variant: "success" as const, label: "Completed" },
  cancelled: { variant: "error" as const, label: "Cancelled" },
  draft: { variant: "secondary" as const, label: "Draft" },
  published: { variant: "success" as const, label: "Published" }
};

export function StatusBadge({ status, size = "sm", className = "" }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant={config.variant} 
      size={size} 
      className={className}
    >
      {config.label}
    </Badge>
  );
}
