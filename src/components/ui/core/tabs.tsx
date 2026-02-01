"use client";

import React from "react";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
  variant?: "default" | "pills" | "underline";
  size?: "sm" | "md" | "lg";
}

export function Tabs({ 
  tabs, 
  defaultTab, 
  className = "", 
  variant = "default",
  size = "md"
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const sizeStyles = {
    sm: {
      tab: "text-sm px-3 py-2",
      content: "text-sm"
    },
    md: {
      tab: "text-sm px-4 py-2.5",
      content: "text-sm"
    },
    lg: {
      tab: "text-base px-6 py-3",
      content: "text-base"
    }
  };

  const variantStyles = {
    default: {
      container: "border-b",
      tab: "border-b-2 border-transparent transition-colors",
      active: "border-b-2 font-medium",
      inactive: "hover:opacity-80"
    },
    pills: {
      container: "rounded-lg p-1",
      tab: "rounded-md transition-colors",
      active: "",
      inactive: "hover:opacity-80"
    },
    underline: {
      container: "border-b",
      tab: "border-b-2 border-transparent transition-colors",
      active: "border-b-2 font-medium",
      inactive: "hover:opacity-80"
    }
  };

  const currentVariant = variantStyles[variant];
  const currentSize = sizeStyles[size];

  return (
    <div className={cn("w-full", className)}>
      {/* Tab Headers */}
      <div 
        className={cn(
          "flex",
          variant === "pills" ? "gap-1" : "gap-6",
          currentVariant.container
        )}
        style={variant === "pills" ? { backgroundColor: "var(--muted)" } : { borderColor: "var(--border)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={cn(
              "flex items-center gap-2 font-medium transition-colors",
              currentSize.tab,
              currentVariant.tab,
              activeTab === tab.id 
                ? currentVariant.active 
                : currentVariant.inactive,
              tab.disabled && "opacity-50 cursor-not-allowed",
              variant === "pills" && activeTab === tab.id && "",
            )}
            style={{
              color: activeTab === tab.id ? "var(--accent)" : "var(--muted-foreground)",
              borderColor: activeTab === tab.id ? "var(--accent)" : "transparent",
              backgroundColor: variant === "pills" && activeTab === tab.id ? "var(--card)" : "transparent"
            }}
          >
            {tab.icon && (
              <span className="flex-shrink-0">
                {tab.icon}
              </span>
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              currentSize.content,
              activeTab === tab.id ? "block" : "hidden"
            )}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple Tab Group for basic usage
interface SimpleTabsProps {
  children: ReactNode;
  className?: string;
}

export function SimpleTabs({ children, className = "" }: SimpleTabsProps) {
  return (
    <div className={cn("w-full", className)}>
      {children}
    </div>
  );
}
