"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSubjects } from "@/lib/contexts";
import { SUBJECT_COLORS, type UserSubject } from "@/lib/types";

interface SubjectSelectorProps {
  value: string | null;
  onChange: (subjectLabel: string | null) => void;
  disabled?: boolean;
}

export default function SubjectSelector({ value, onChange, disabled }: SubjectSelectorProps) {
  const { subjects, addSubject, deleteSubject } = useSubjects();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<string>(SUBJECT_COLORS[0]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = subjects.find((s) => s.label === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setConfirmDelete(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus input when adding
  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    if (subjects.some((s) => s.label.toLowerCase() === trimmed.toLowerCase())) return;
    addSubject(trimmed, newColor);
    onChange(trimmed);
    setNewLabel("");
    setNewColor(SUBJECT_COLORS[0]);
    setAdding(false);
    setOpen(false);
  };

  const handleDelete = (sub: UserSubject) => {
    if (confirmDelete === sub.id) {
      deleteSubject(sub.id);
      if (value === sub.label) onChange(null);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(sub.id);
    }
  };

  const handleSelect = (sub: UserSubject) => {
    onChange(value === sub.label ? null : sub.label);
    setOpen(false);
    setConfirmDelete(null);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => { if (!disabled) setOpen(!open); }}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2 rounded-full text-sm w-full max-w-[260px] border transition-[background-color,border-color,transform] duration-150 ease-out press",
          open
            ? "bg-white/[0.07] border-white/30"
            : "bg-white/[0.04] border-white/12 hover:bg-white/[0.07] hover:border-white/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {selected ? (
          <>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
            <span className="text-white/90 truncate">{selected.label}</span>
          </>
        ) : (
          <span className="text-white/45">Select subject</span>
        )}
        <svg className="ml-auto flex-shrink-0 text-white/45" width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <path d={open ? "M3 7.5L6 4.5L9 7.5" : "M3 4.5L6 7.5L9 4.5"} />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-2 w-64 rounded-2xl overflow-hidden dropdown-enter"
          style={{
            backgroundColor: "rgba(18, 22, 30, 0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.6)",
            transformOrigin: "top left",
          }}
        >
          {/* Subject list */}
          {subjects.length > 0 && (
            <div className="max-h-48 overflow-y-auto py-1">
              {subjects.map((sub) => (
                <div
                  key={sub.id}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 cursor-pointer group transition-colors duration-150",
                    value === sub.label
                      ? "bg-white/8"
                      : "hover:bg-white/[0.04]"
                  )}
                >
                  <div
                    className="flex items-center gap-2.5 flex-1 min-w-0"
                    onClick={() => handleSelect(sub)}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />
                    <span className={cn(
                      "text-sm truncate",
                      value === sub.label
                        ? "text-white font-medium"
                        : "text-white/70"
                    )}>
                      {sub.label}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(sub); }}
                    className={cn(
                      "flex-shrink-0 p-0.5 rounded transition-colors duration-150",
                      confirmDelete === sub.id
                        ? "text-red-400 opacity-100"
                        : "text-white/30 opacity-0 group-hover:opacity-100 hover:text-red-400"
                    )}
                    title={confirmDelete === sub.id ? "Click again to confirm" : "Delete subject"}
                  >
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                      <path d="M3 3l6 6M9 3l-6 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-white/8" />

          {adding ? (
            <div className="p-3 space-y-3">
              <input
                ref={inputRef}
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
                placeholder="Subject name"
                maxLength={30}
                className="w-full px-3 py-1.5 text-sm rounded-md border border-white/15 bg-white/5 text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 transition-colors duration-150"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={cn(
                      "w-5 h-5 rounded-full transition-transform duration-150",
                      newColor === c ? "ring-2 ring-offset-2 ring-white/70 ring-offset-[#13171f]" : "hover:scale-110"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newLabel.trim()}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-white text-[#0a0d14] hover:bg-white/90 disabled:bg-white/20 disabled:text-white/45 disabled:cursor-not-allowed transition-colors duration-150 press"
                >
                  Add
                </button>
                <button
                  onClick={() => { setAdding(false); setNewLabel(""); }}
                  className="px-3 py-1 text-xs font-medium rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-colors duration-150 press"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors duration-150"
            >
              <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <path d="M6 2v8M2 6h8" />
              </svg>
              New subject
            </button>
          )}
        </div>
      )}
    </div>
  );
}
