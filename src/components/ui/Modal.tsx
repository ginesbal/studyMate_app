"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg";
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Body scroll-lock is a shared global, so ref-count it: with two modals open
// (e.g. the detail modal handing off to the edit form) the lock must survive
// until the last one closes rather than the first close clearing it.
let scrollLockCount = 0;
function lockBodyScroll() {
  if (scrollLockCount === 0) document.body.style.overflow = "hidden";
  scrollLockCount += 1;
}
function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) document.body.style.overflow = "";
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = "md",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Lock body scroll while open (ref-counted across modal instances).
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [open]);

  // Esc to close.
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  // Move focus into the dialog on open and restore it to the trigger on
  // close. An autofocused field inside wins — we only reach for the first
  // focusable when nothing in the panel has already taken focus.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      if (!panel.contains(document.activeElement)) {
        const first = panel.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? panel).focus();
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  // Keep Tab focus within the panel (focus trap).
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE)
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    // "adrift" = focus is on the panel root or escaped to a now-removed
    // element; either way pull it back to an edge so Tab can't reach the
    // page behind the dialog.
    const adrift = !active || active === panel || !panel.contains(active);
    if (e.shiftKey && (active === first || adrift)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || adrift)) {
      e.preventDefault();
      first.focus();
    }
  }

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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Dialog"}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          "modal-panel-enter relative bg-white dark:bg-lavender-900 rounded-2xl shadow-lg p-6 outline-none",
          width === "sm" && "w-full max-w-sm",
          width === "md" && "w-full max-w-lg",
          width === "lg" && "w-full max-w-2xl",
          "mx-4"
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 id={titleId} className="text-title text-baltic-800 dark:text-baltic-100">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
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
