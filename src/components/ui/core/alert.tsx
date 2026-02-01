"use client";

import React from "react";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface AlertProps {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
  dismissible?: boolean;
}

const variants = {
  info: {
    iconColor: "var(--accent)",
    icon: InformationCircleIcon
  },
  success: {
    iconColor: "#10b981",
    icon: CheckCircleIcon
  },
  warning: {
    iconColor: "#f59e0b",
    icon: ExclamationTriangleIcon
  },
  error: {
    iconColor: "#ef4444",
    icon: XCircleIcon
  }
};

export function Alert({ 
  variant = "info",
  title, 
  children, 
  className = "", 
  onClose, 
  dismissible = false 
}: AlertProps) {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "rounded-xl shadow-sm p-4 flex items-start gap-3 max-w-lg",
        className
      )}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)'
      }}
    >
      <Icon 
        className="h-5 w-5 flex-shrink-0 mt-0.5" 
        style={{ color: config.iconColor }}
      />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 
            className="text-sm font-medium mb-1"
            style={{ color: "var(--foreground)" }}
          >
            {title}
          </h4>
        )}
        <div 
          className="text-sm leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          {children}
        </div>
      </div>
      {dismissible && onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Toast variant for temporary notifications - Minimal style
interface ToastProps extends Omit<AlertProps, 'className' | 'title'> {
  title?: string;
  duration?: number;
}

export function Toast({ title, children, variant = 'info', onClose, ...props }: ToastProps) {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-xs animate-in slide-in-from-right-full duration-300">
      <div 
        className="rounded-lg shadow-lg p-3 flex items-center gap-2 border"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)'
        }}
      >
        <Icon 
          className="h-4 w-4 flex-shrink-0" 
          style={{ color: config.iconColor }}
        />
        <div className="flex-1 min-w-0">
          <p 
            className="text-xs font-medium truncate"
            style={{ color: "var(--foreground)" }}
          >
            {title || children}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
            style={{ color: "var(--muted-foreground)" }}
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
