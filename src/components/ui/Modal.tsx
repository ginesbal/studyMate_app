"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg";
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = "md",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="modal-backdrop-enter absolute inset-0 bg-baltic-950/30 dark:bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={cn(
          "modal-panel-enter relative bg-white dark:bg-lavender-900 rounded-2xl shadow-lg p-6",
          width === "sm" && "w-full max-w-sm",
          width === "md" && "w-full max-w-lg",
          width === "lg" && "w-full max-w-2xl",
          "mx-4"
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-title text-baltic-800 dark:text-baltic-100">{title}</h2>
            <button
              onClick={onClose}
              className="text-steel-400 hover:text-baltic-600 dark:hover:text-baltic-300 transition-smooth p-1"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 4l10 10M14 4L4 14" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
