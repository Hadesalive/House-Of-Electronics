import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  PlusIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import type { QuickAction } from "./quick-actions-data";

interface QuickActionsPanelProps {
  actions: QuickAction[];
  className?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  variant?: "floating" | "inline";
}

export function QuickActionsPanel({ 
  actions, 
  className = "",
  position = "bottom-right",
  variant = "floating"
}: QuickActionsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);


  const actionColors = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    accent: "bg-accent text-accent-contrast hover:bg-accent/90"
  };

  if (variant === "inline") {
    return (
      <div className={cn("relative", className)}>
        {/* Action Buttons */}
        <div className={cn(
          "absolute top-full right-0 mt-2 flex flex-col gap-2 transition-all duration-300 ease-in-out z-[9999]",
          "bg-card border border-border rounded-xl shadow-lg p-2 min-w-[200px]",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        style={{ 
          background: 'var(--card)',
          borderColor: 'var(--border)'
        }}>
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                "hover:bg-muted/50 active:scale-95 whitespace-nowrap w-full text-left",
                "bg-transparent border-0"
              )}
              style={{ 
                color: 'var(--foreground)'
              }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>

        {/* Main Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-9 w-9 rounded-md flex items-center justify-center transition-all duration-200",
            "hover:shadow-lg active:scale-95 border border-border",
            "bg-accent text-accent-contrast hover:bg-accent/90",
            "backdrop-blur-sm"
          )}
          style={{ 
            background: 'var(--accent)', 
            color: 'var(--accent-contrast)',
            borderColor: 'var(--border)'
          }}
        >
          {isOpen ? (
            <XMarkIcon className="h-4 w-4" />
          ) : (
            <PlusIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div 
      className={cn("fixed z-50", className)} 
      style={{ 
        right: position.includes('right') ? '8px' : undefined,
        left: position.includes('left') ? '16px' : undefined,
        bottom: position.includes('bottom') ? '16px' : undefined,
        top: position.includes('top') ? '16px' : undefined
      }}
    >
      {/* Action Buttons */}
      <div className={cn(
        "flex flex-col gap-3 transition-all duration-300 ease-in-out",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {actions.map((action, index) => (
          <button
            key={action.id}
            onClick={() => {
              action.onClick();
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
              "border border-border hover:shadow-lg active:scale-95 whitespace-nowrap",
              "backdrop-blur-sm",
              actionColors[action.color || "accent"],
              "animate-in slide-in-from-bottom-2 duration-300"
            )}
            style={{ 
              animationDelay: `${index * 50}ms`,
              background: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-9 w-9 rounded-md flex items-center justify-center transition-all duration-200",
          "hover:shadow-lg active:scale-95 border border-border",
          "bg-accent text-accent-contrast hover:bg-accent/90",
          "backdrop-blur-sm"
        )}
        style={{ 
          background: 'var(--accent)', 
          color: 'var(--accent-contrast)',
          borderColor: 'var(--border)'
        }}
      >
        {isOpen ? (
          <XMarkIcon className="h-4 w-4" />
        ) : (
          <PlusIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

