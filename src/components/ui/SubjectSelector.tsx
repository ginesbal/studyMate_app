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
          "flex items-center gap-2 px-3.5 py-2 rounded-full text-sm w-full max-w-[260px] border bg-white transition-[background-color,border-color,transform] duration-150 ease-out press",
          open
            ? "border-baltic-400 ring-2 ring-baltic-400/20"
            : "border-lavender-200 hover:border-lavender-300",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {selected ? (
          <>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
            <span className="text-baltic-700 truncate">{selected.label}</span>
          </>
        ) : (
          <span className="text-steel-400">Select subject</span>
        )}
        <svg className="ml-auto flex-shrink-0 text-steel-400" width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <path d={open ? "M3 7.5L6 4.5L9 7.5" : "M3 4.5L6 7.5L9 4.5"} />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-2 w-64 rounded-2xl overflow-hidden bg-white border border-lavender-200 shadow-[0_16px_36px_-12px_rgba(38,45,64,0.28)] dropdown-enter"
          style={{ transformOrigin: "top left" }}
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
                      ? "bg-baltic-50"
                      : "hover:bg-lavender-50"
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
                        ? "text-baltic-700 font-medium"
                        : "text-baltic-600"
                    )}>
                      {sub.label}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(sub); }}
                    className={cn(
                      "flex-shrink-0 p-0.5 rounded transition-colors duration-150",
                      confirmDelete === sub.id
                        ? "text-red-500 opacity-100"
                        : "text-steel-400 opacity-0 group-hover:opacity-100 hover:text-red-500"
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

          <div className="border-t border-lavender-100" />

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
                className="w-full px-3 py-1.5 text-sm rounded-md border border-lavender-200 bg-white text-baltic-800 placeholder:text-steel-400 outline-none focus:ring-2 focus:ring-baltic-400/20 focus:border-baltic-400 transition-colors duration-150"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={cn(
                      "w-5 h-5 rounded-full transition-transform duration-150",
                      newColor === c ? "ring-2 ring-offset-2 ring-baltic-400 ring-offset-white" : "hover:scale-110"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newLabel.trim()}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-baltic-600 text-white hover:bg-baltic-700 disabled:bg-baltic-200 disabled:cursor-not-allowed transition-colors duration-150 press"
                >
                  Add
                </button>
                <button
                  onClick={() => { setAdding(false); setNewLabel(""); }}
                  className="px-3 py-1 text-xs font-medium rounded-full text-steel-500 hover:text-baltic-600 hover:bg-lavender-50 transition-colors duration-150 press"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-steel-500 hover:text-baltic-600 hover:bg-lavender-50 transition-colors duration-150"
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
