import React from "react";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          {
            "h-9 px-3 py-2": size === "default",
            "h-8 rounded-md px-2.5 text-xs": size === "sm",
            "h-10 rounded-md px-6": size === "lg",
            "h-9 w-9": size === "icon",
          },
          className
        )}
        style={{
          backgroundColor: variant === "default" ? 'var(--accent)' :
                          variant === "destructive" ? 'var(--destructive)' :
                          variant === "outline" ? 'transparent' :
                          variant === "secondary" ? 'var(--muted)' : 
                          variant === "ghost" || variant === "link" ? 'transparent' : undefined,
          color: variant === "default" ? 'var(--accent-contrast)' :
                 variant === "destructive" ? 'white' :
                 variant === "outline" || variant === "secondary" ? 'var(--foreground)' :
                 variant === "link" ? '#ea580c' : 
                 variant === "ghost" ? 'var(--foreground)' : undefined,
          border: variant === "outline" ? '1px solid var(--border)' : undefined,
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
