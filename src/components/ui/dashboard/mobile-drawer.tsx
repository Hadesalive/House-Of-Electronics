"use client";

import React from "react";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export function MobileDrawer({ id, title, children, className = "" }: MobileDrawerProps) {
  const handleClose = (e: React.MouseEvent) => {
    const dialog = e.currentTarget.closest('dialog') as HTMLDialogElement;
    dialog?.close();
  };

  return (
    <dialog 
      id={id} 
      className={cn(
        "lg:hidden p-0 rounded-xl shadow-xl w-[90vw] max-w-sm",
        className
      )}
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{title}</span>
          <button 
            className="h-8 w-8 rounded-md flex items-center justify-center"
            style={{ border: '1px solid var(--border)' }} 
            onClick={handleClose}
          >
            ✕
          </button>
        </div>
      </div>
      {children}
    </dialog>
  );
}
