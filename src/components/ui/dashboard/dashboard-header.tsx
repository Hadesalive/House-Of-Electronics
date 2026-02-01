"use client";

import React from "react";

import { ReactNode } from "react";
import { Bars3Icon, SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/contexts/ThemeContext";
import { NotificationIcon, GlobalSearch } from "@/components/ui/core";

interface DashboardHeaderProps {
  title: string;
  onMenuClick?: () => void;
  searchPlaceholder?: string;
  actions?: ReactNode;
  className?: string;
}

export function DashboardHeader({ 
  title, 
  onMenuClick, 
  searchPlaceholder = "Search…", 
  actions,
  className = "" 
}: DashboardHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <header 
      className={`sticky top-0 z-10 bg-[--background]/80 backdrop-blur-md supports-[backdrop-filter]:bg-[--background]/70 border-b ${className}`} 
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center justify-between h-12 px-4">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              className="lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-[--color-card] transition-colors"
              onClick={onMenuClick}
              aria-label="Open navigation"
            >
              <Bars3Icon className="h-4 w-4" style={{ color: 'var(--color-foreground)' }} />
            </button>
          )}
          <h1 className="text-lg font-medium" style={{ color: 'var(--color-foreground)' }}>{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <GlobalSearch />
          <NotificationIcon />
          <button
            onClick={toggleTheme}
            className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-[--color-card] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon className="h-4 w-4" style={{ color: 'var(--color-foreground)' }} /> : <MoonIcon className="h-4 w-4" style={{ color: 'var(--color-foreground)' }} />}
          </button>
          {actions}
        </div>
      </div>
    </header>
  );
}
