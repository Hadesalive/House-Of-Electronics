import React from "react";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: RadioOption[];
  name: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, error, helperText, options, name, ...props }, ref) => {
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
        <div className="space-y-2">
          {options.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <input
                type="radio"
                id={`${name}-${option.value}`}
                name={name}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  "h-4 w-4 border transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  error && "border-red-500 focus:ring-red-500",
                  className
                )}
                style={{
                  borderColor: error ? '#ef4444' : 'var(--border)',
                  accentColor: 'var(--accent)'
                }}
                ref={ref}
                {...props}
              />
              <label 
                htmlFor={`${name}-${option.value}`}
                className="text-sm cursor-pointer"
                style={{ 
                  color: option.disabled ? 'var(--muted-foreground)' : 'var(--foreground)' 
                }}
              >
                {option.label}
              </label>
            </div>
          ))}
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

Radio.displayName = "Radio";
