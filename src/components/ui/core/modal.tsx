"use client";

import React from "react";

import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-full mx-4"
};

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = "md", 
  className = "",
  closeOnOverlayClick = true,
  showCloseButton = true
}: ModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        className={cn(
          "relative w-full rounded-xl transform transition-all",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          sizeStyles[size],
          className
        )}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)"
        }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div 
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            {title && (
              <h2 
                className="text-lg font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-black/5 transition-colors"
                style={{ color: "var(--muted-foreground)" }}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Confirmation Modal
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  variant = "default"
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {message}
        </p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md border transition-colors hover:bg-black/5"
            style={{
              color: "var(--foreground)",
              borderColor: "var(--border)"
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium rounded-md text-white transition-colors"
            style={{
              backgroundColor: variant === "danger" ? "#ef4444" : "var(--accent)"
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
