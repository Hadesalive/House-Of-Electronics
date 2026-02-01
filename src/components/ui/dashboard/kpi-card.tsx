import React, { useEffect, useState } from "react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState, LoadingState } from "./empty-state";

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  className?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  subtitle?: string;
  accentColor?: string;
  fillOpacity?: number;
}

export function KPICard({ 
  title, 
  value, 
  icon, 
  className = "", 
  trend,
  loading = false,
  empty = false,
  emptyTitle,
  emptyDescription,
  emptyAction,
  subtitle,
  accentColor,
  fillOpacity = 0.05
}: KPICardProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('theme-dark'));
    };
    
    checkDarkMode();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Glassmorphism styles for light and dark mode
  const getGlassmorphismStyles = () => {
    if (isDark) {
      // Dark mode: darker background, lighter border
      return {
        background: accentColor 
          ? (accentColor.startsWith('#') 
              ? (() => {
                  const hex = accentColor.replace('#', '');
                  const r = parseInt(hex.substring(0, 2), 16);
                  const g = parseInt(hex.substring(2, 4), 16);
                  const b = parseInt(hex.substring(4, 6), 16);
                  return `rgba(${r}, ${g}, ${b}, ${fillOpacity * 0.6})`;
                })()
              : `rgba(59, 130, 246, ${fillOpacity * 0.6})`)
          : 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      };
    } else {
      // Light mode: lighter background, darker border
      return {
        background: accentColor 
          ? (accentColor.startsWith('#') 
              ? (() => {
                  const hex = accentColor.replace('#', '');
                  const r = parseInt(hex.substring(0, 2), 16);
                  const g = parseInt(hex.substring(2, 4), 16);
                  const b = parseInt(hex.substring(4, 6), 16);
                  return `rgba(${r}, ${g}, ${b}, ${fillOpacity * 0.4})`;
                })()
              : `rgba(59, 130, 246, ${fillOpacity * 0.4})`)
          : 'rgba(255, 255, 255, 0.6)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
      };
    }
  };

  const glassStyles = getGlassmorphismStyles();
  const color = accentColor || 'var(--accent)';

  // Convert hex to rgba for gradient overlay
  const getFrostedGradient = () => {
    if (!accentColor) {
      return isDark
        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 50%, rgba(255, 255, 255, 0.02) 100%)'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 50%, rgba(255, 255, 255, 0.2) 100%)';
    }
    
    if (accentColor.startsWith('#')) {
      const hex = accentColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const opacity1 = isDark ? 0.08 : 0.12;
      const opacity2 = isDark ? 0.04 : 0.06;
      return `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, ${opacity1}) 0%, transparent 50%, rgba(${r}, ${g}, ${b}, ${opacity2}) 100%)`;
    }
    
    // For CSS variables, use default
    return isDark
      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, transparent 50%, rgba(59, 130, 246, 0.04) 100%)'
      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, transparent 50%, rgba(59, 130, 246, 0.06) 100%)';
  };

  if (loading) {
    return (
      <div className={cn(
        "relative rounded-lg overflow-hidden backdrop-blur-md",
        className
      )} 
           style={glassStyles}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 w-20 rounded bg-[var(--muted)] animate-pulse" />
            <div className="h-5 w-5 rounded bg-[var(--muted)] animate-pulse" />
          </div>
          <div className="h-7 w-24 rounded bg-[var(--muted)] animate-pulse" />
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className={cn(
        "relative rounded-lg overflow-hidden backdrop-blur-md",
        className
      )} 
           style={glassStyles}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>{title}</div>
            {icon && (
              <div className="opacity-20" style={{ color: 'var(--muted-foreground)' }}>
                {icon}
              </div>
            )}
          </div>
          <EmptyState
            title={emptyTitle || "No data available"}
            description={emptyDescription}
            action={emptyAction}
            size="sm"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative rounded-lg overflow-hidden transition-all duration-200",
      "hover:shadow-lg",
      "backdrop-blur-md",
      isDark ? "hover:shadow-black/20" : "hover:shadow-black/10",
      className
    )} 
         style={glassStyles}>
      {/* Frosted color overlay on top */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-lg"
        style={{
          background: getFrostedGradient(),
          mixBlendMode: isDark ? 'screen' : 'overlay',
          opacity: 0.9,
        }}
      />
      
      {/* Content */}
      <div className="relative p-4 z-10">
        {/* Header Row - Compact */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
              {title}
            </div>
          </div>
          {icon && (
            <div 
              className="ml-2 flex-shrink-0 opacity-70 transition-opacity hover:opacity-100"
              style={{ 
                color: color,
              }}
            >
              <div className="scale-90">
                {icon}
              </div>
            </div>
          )}
        </div>

        {/* Value - Compact but readable */}
        <div className="mb-2">
          <div 
            className="text-xl font-semibold leading-tight tracking-tight" 
            style={{ color: 'var(--foreground)' }}
          >
            {value}
          </div>
          {subtitle && (
            <div className="text-[10px] font-normal mt-0.5" style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Trend indicator - Minimal */}
        {trend && (
          <div className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
            trend.isPositive 
              ? "text-emerald-600 dark:text-emerald-500" 
              : "text-rose-600 dark:text-rose-500"
          )}>
            <span className="text-xs">{trend.isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
