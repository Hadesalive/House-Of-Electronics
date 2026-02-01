import React from "react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className = "",
  size = "md"
}: EmptyStateProps) {
  const sizeClasses = {
    sm: "py-8",
    md: "py-12", 
    lg: "py-16"
  };

  const iconSizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      sizeClasses[size],
      className
    )}>
      {icon && (
        <div className={cn(
          "rounded-full flex items-center justify-center mb-4",
          iconSizeClasses[size],
          "bg-muted/50"
        )}>
          {icon}
        </div>
      )}
      <h3 className={cn(
        "font-medium mb-2",
        size === "sm" ? "text-sm" : size === "md" ? "text-base" : "text-lg"
      )} style={{ color: 'var(--foreground)' }}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          "max-w-sm",
          size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
        )} style={{ color: 'var(--muted-foreground)' }}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}

interface LoadingStateProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({ className = "", size = "md" }: LoadingStateProps) {
  const sizeClasses = {
    sm: "py-8",
    md: "py-12",
    lg: "py-16"
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      sizeClasses[size],
      className
    )}>
      <div className={cn(
        "animate-spin rounded-full border-2 border-muted border-t-accent",
        size === "sm" ? "h-6 w-6" : size === "md" ? "h-8 w-8" : "h-12 w-12"
      )} />
      <p className={cn(
        "mt-3",
        size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
      )} style={{ color: 'var(--muted-foreground)' }}>
        Loading...
      </p>
    </div>
  );
}
