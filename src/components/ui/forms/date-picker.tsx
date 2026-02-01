import React from "react";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "@heroicons/react/24/outline";

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label 
            className="text-sm font-medium block" 
            style={{ color: 'var(--foreground)' }}
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            type="date"
            className={cn(
              "flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "pr-10",
              error && "border-red-500 focus:ring-red-500",
              className
            )}
            style={{
              backgroundColor: 'var(--card)',
              borderColor: error ? '#ef4444' : 'var(--border)',
              color: 'var(--foreground)'
            }}
            ref={ref}
            {...props}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <CalendarIcon className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";
