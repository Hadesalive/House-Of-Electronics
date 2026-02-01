import React from "react";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@heroicons/react/24/outline";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <div className="flex items-start space-x-3">
          <div className="relative">
            <input
              type="checkbox"
              className={cn(
                "peer h-4 w-4 rounded border transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "appearance-none",
                error && "border-red-500 focus:ring-red-500",
                className
              )}
              style={{
                backgroundColor: 'var(--card)',
                borderColor: error ? '#ef4444' : 'var(--border)'
              }}
              ref={ref}
              {...props}
            />
            <div 
              className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity"
              style={{ color: 'var(--accent)' }}
            >
              <CheckIcon className="h-3 w-3" />
            </div>
          </div>
          {label && (
            <label 
              className="text-sm font-medium cursor-pointer flex-1" 
              style={{ color: 'var(--foreground)' }}
              htmlFor={props.id}
            >
              {label}
              {props.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-500 ml-7">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm ml-7" style={{ color: 'var(--muted-foreground)' }}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
