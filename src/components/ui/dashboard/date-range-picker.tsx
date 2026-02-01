import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export type DateRange = {
  start: Date | null;
  end: Date | null;
};

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  placeholder?: string;
  presets?: Array<{
    label: string;
    value: DateRange;
  }>;
}

const defaultPresets = [
  {
    label: "Today",
    value: (() => {
      const today = new Date();
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    })()
  },
  {
    label: "Yesterday", 
    value: (() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const start = new Date(yesterday);
      start.setHours(0, 0, 0, 0);
      const end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    })()
  },
  {
    label: "Last 7 days",
    value: (() => {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { start, end: new Date() };
    })()
  },
  {
    label: "Last 30 days",
    value: (() => {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { start, end: new Date() };
    })()
  },
  {
    label: "This month",
    value: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date()
    }
  },
  {
    label: "Last month",
    value: {
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
    }
  }
];

export function DateRangePicker({
  value,
  onChange,
  className = "",
  placeholder = "Select date range",
  presets = defaultPresets
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatDateRange = () => {
    if (!value.start || !value.end) return placeholder;
    return `${formatDate(value.start)} - ${formatDate(value.end)}`;
  };

  const handlePresetSelect = (preset: DateRange) => {
    onChange(preset);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        onChange({ start, end });
        setIsOpen(false);
      }
    }
  };

  const handleClear = () => {
    onChange({ start: null, end: null });
    setCustomStart("");
    setCustomEnd("");
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border border-border",
          "bg-card text-card-foreground hover:bg-muted/50 transition-colors",
          "min-w-[200px] justify-between"
        )}
        style={{ 
          background: 'var(--card)', 
          color: 'var(--card-foreground)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
          <span className="text-sm">{formatDateRange()}</span>
        </div>
        <ChevronDownIcon className={cn(
          "h-4 w-4 transition-transform",
          isOpen && "rotate-180"
        )} style={{ color: 'var(--muted-foreground)' }} />
      </button>

      {isOpen && (
        <div className={cn(
          "absolute top-full left-0 mt-2 w-80 rounded-xl border border-border shadow-lg",
          "bg-card text-card-foreground z-50"
        )} style={{ 
          background: 'var(--card)', 
          color: 'var(--card-foreground)',
          borderColor: 'var(--border)'
        }}>
          {/* Presets */}
          <div className="p-4 border-b border-border" style={{ borderColor: 'var(--border)' }}>
            <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
              Quick Select
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={cn(
                    "px-3 py-2 text-sm rounded-lg text-left transition-colors",
                    "hover:bg-muted/50 border border-transparent hover:border-border"
                  )}
                  style={{ 
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Range */}
          <div className="p-4">
            <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
              Custom Range
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-lg border border-border",
                    "bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
                  )}
                  style={{ 
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)'
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-lg border border-border",
                    "bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
                  )}
                  style={{ 
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-4 border-t border-border" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={handleClear}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Clear
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors"
                style={{ 
                  color: 'var(--foreground)',
                  borderColor: 'var(--border)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className={cn(
                  "px-3 py-1 text-sm rounded-lg transition-colors",
                  "bg-accent text-accent-contrast hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                style={{ 
                  background: 'var(--accent)',
                  color: 'var(--accent-contrast)'
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
