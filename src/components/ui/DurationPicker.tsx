"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

const PRESETS = [5, 15, 25, 45, 60, 90, 120];
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

function snapToStep(v: number) {
  return Math.round(v / STEP) * STEP;
}

export default function DurationPicker({ value, onChange, disabled }: DurationPickerProps) {
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null);

  const increment = useCallback(() => {
    onChange(clamp(value + STEP));
  }, [value, onChange]);

  const decrement = useCallback(() => {
    onChange(clamp(value - STEP));
  }, [value, onChange]);

  // Mouse wheel on the number
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? STEP : -STEP;
      onChange(clamp(value + delta));
    },
    [value, onChange]
  );

  // Touch/mouse drag on the number
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      dragRef.current = { startY: e.clientY, startVal: value };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [value, disabled]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dy = dragRef.current.startY - e.clientY;
      const delta = Math.round(dy / 8) * STEP;
      onChange(clamp(snapToStep(dragRef.current.startVal + delta)));
    },
    [onChange]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

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
      <div className="flex items-center gap-6">
        {/* Minus button */}
        <button
          onClick={decrement}
          disabled={disabled || value <= MIN}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-white/15 text-white/70 hover:bg-white/10 hover:border-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-[background-color,border-color,transform] duration-150 ease-out press"
          aria-label="Decrease duration"
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M4 8h8" />
          </svg>
        </button>

        {/* Draggable number display */}
        <div
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={cn(
            "select-none touch-none cursor-ns-resize flex flex-col items-center min-w-[6ch]",
            disabled && "pointer-events-none opacity-50"
          )}
          title="Scroll or drag to change"
        >
          <span className="text-6xl font-extralight tracking-tighter tabular-nums text-white leading-none">
            {formatDisplay(value)}
          </span>
          {value < 60 && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/35 mt-2">minutes</span>
          )}
        </div>

        {/* Plus button */}
        <button
          onClick={increment}
          disabled={disabled || value >= MAX}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-white/15 text-white/70 hover:bg-white/10 hover:border-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-[background-color,border-color,transform] duration-150 ease-out press"
          aria-label="Increase duration"
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M8 4v8M4 8h8" />
          </svg>
        </button>
      </div>

      {/* Preset chips */}
      <div className="flex items-center gap-1 flex-wrap justify-center" role="group" aria-label="Duration presets">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            disabled={disabled}
            aria-pressed={value === p}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium tabular-nums transition-[background-color,color] duration-150 ease-out press",
              value === p
                ? "bg-white/12 text-white"
                : "text-white/40 hover:text-white/80 hover:bg-white/5"
            )}
          >
            {p >= 60 ? `${p / 60}h` : `${p}m`}
          </button>
        ))}
      </div>
    </div>
  );
}
