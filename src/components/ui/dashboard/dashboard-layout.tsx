import React from "react";

import { ReactNode } from "react";

interface DashboardLayoutProps {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  mobileDrawer?: ReactNode;
  className?: string;
  sidebarCollapsed?: boolean;
}

export function DashboardLayout({ 
  sidebar, 
  header, 
  children, 
  mobileDrawer,
  className = "",
  sidebarCollapsed = false
}: DashboardLayoutProps) {
  const sidebarWidth = sidebarCollapsed ? 64 : 256; // 64px (4rem) when collapsed, 256px (16rem) when expanded
  
  return (
    <div className={`min-h-screen overflow-x-hidden ${className}`}>
      <div className="flex">
        {/* Left Sidebar (desktop) - Fixed */}
        <div 
          className="hidden lg:block fixed left-0 top-0 h-screen z-10 transition-all duration-300"
          style={{ width: `${sidebarWidth}px` }}
        >
          {sidebar}
        </div>
        
        {/* Main Column - Offset for fixed sidebar */}
        <main 
          className="flex-1 overflow-x-hidden transition-all duration-300"
          style={{ marginLeft: `${sidebarWidth}px` }}
        >
          <div className="py-6 px-4 md:px-8 lg:px-10 space-y-8">
            {header}
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile drawer */}
      {mobileDrawer}
    </div>
  );
}
