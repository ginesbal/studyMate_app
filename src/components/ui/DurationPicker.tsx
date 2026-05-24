"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";

const PRESETS = [25, 45, 60, 90];
const MIN = 5;
const MAX = 120;
const STEP = 5;

interface DurationPickerProps {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function clamp(v: number) {
  return Math.max(MIN, Math.min(MAX, v));
}

export default function DurationPicker({ value, onChange, disabled }: DurationPickerProps) {
  const increment = useCallback(() => onChange(clamp(value + STEP)), [value, onChange]);
  const decrement = useCallback(() => onChange(clamp(value - STEP)), [value, onChange]);

  const formatDisplay = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m === 0 ? `${h}h` : `${h}h ${m}m`;
    }
    return `${mins}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Stepper row */}
      <div className="flex items-center gap-5">
        <button
          onClick={decrement}
          disabled={disabled || value <= MIN}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-lavender-200 text-baltic-500 hover:bg-lavender-50 hover:border-lavender-300 disabled:opacity-30 disabled:cursor-not-allowed transition-[background-color,border-color,transform] duration-150 ease-out press"
          aria-label="Decrease duration"
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M4 8h8" />
          </svg>
        </button>

        <div className="flex flex-col items-center min-w-[4ch]">
          <span className="text-5xl font-extralight tracking-tight tabular-nums text-baltic-800 leading-none">
            {formatDisplay(value)}
          </span>
          {value < 60 && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-steel-400 mt-2">minutes</span>
          )}
        </div>

        <button
          onClick={increment}
          disabled={disabled || value >= MAX}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-lavender-200 text-baltic-500 hover:bg-lavender-50 hover:border-lavender-300 disabled:opacity-30 disabled:cursor-not-allowed transition-[background-color,border-color,transform] duration-150 ease-out press"
          aria-label="Increase duration"
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M8 4v8M4 8h8" />
          </svg>
        </button>
      </div>

      {/* Preset chips */}
      <div className="flex items-center gap-1.5" role="group" aria-label="Duration presets">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            disabled={disabled}
            aria-pressed={value === p}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium tabular-nums transition-[background-color,color] duration-150 ease-out press",
              value === p
                ? "bg-baltic-100 text-baltic-700"
                : "text-steel-400 hover:text-baltic-600 hover:bg-lavender-50"
            )}
          >
            {p >= 60 ? `${p / 60}h` : `${p}m`}
          </button>
        ))}
      </div>
    </div>
  );
}
