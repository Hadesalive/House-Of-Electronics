import React, { useState, useEffect } from "react";
import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, error, helperText, checked, onChange, ...props }, ref) => {
    const [isChecked, setIsChecked] = useState(checked || false);

    // Sync with external state changes
    useEffect(() => {
      setIsChecked(checked || false);
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = e.target.checked;
      setIsChecked(newChecked);
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              ref={ref}
              checked={isChecked}
              onChange={handleChange}
              {...props}
            />
            <button
              type="button"
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none",
                props.disabled && "cursor-not-allowed opacity-50",
                error && "border-2 border-red-500"
              )}
              style={{
                backgroundColor: isChecked 
                  ? 'var(--accent)' 
                  : '#9ca3af',
                border: isChecked ? 'none' : '1px solid var(--border)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = '';
              }}
              onClick={() => {
                if (!props.disabled) {
                  const newChecked = !isChecked;
                  setIsChecked(newChecked);
                  // Create a synthetic event
                  const syntheticEvent = {
                    target: { checked: newChecked },
                    currentTarget: { checked: newChecked }
                  } as React.ChangeEvent<HTMLInputElement>;
                  if (onChange) {
                    onChange(syntheticEvent);
                  }
                }
              }}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ease-in-out",
                  isChecked ? "translate-x-6" : "translate-x-1"
                )}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
              />
            </button>
          </div>
          {label && (
            <label 
              className="text-sm font-medium cursor-pointer flex-1" 
              style={{ color: 'var(--foreground)' }}
              htmlFor={props.id}
              onClick={() => {
                if (!props.disabled) {
                  const newChecked = !isChecked;
                  setIsChecked(newChecked);
                  // Create a synthetic event
                  const syntheticEvent = {
                    target: { checked: newChecked },
                    currentTarget: { checked: newChecked }
                  } as React.ChangeEvent<HTMLInputElement>;
                  if (onChange) {
                    onChange(syntheticEvent);
                  }
                }
              }}
            >
              {label}
              {props.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-500 ml-14">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm ml-14" style={{ color: 'var(--muted-foreground)' }}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Switch.displayName = "Switch";
