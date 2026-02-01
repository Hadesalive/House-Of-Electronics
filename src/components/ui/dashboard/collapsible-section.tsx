import React, { useState } from "react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerActions?: ReactNode;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  className = "",
  headerActions
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-lg font-semibold hover:opacity-80 transition-opacity"
          style={{ color: 'var(--foreground)' }}
        >
          {title}
          {isOpen ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </button>
        {headerActions && (
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden",
        isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
