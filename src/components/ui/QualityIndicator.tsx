"use client";

import { cn } from "@/lib/utils";
import { FocusQuality, QUALITY_LEVELS } from "@/lib/types";

interface QualityIndicatorProps {
  quality: FocusQuality;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

/**
 * Displays a single focus quality circle.
 * 4 visual states using fill amount — abstract, non-verbal.
 * Design rationale: Reduces cognitive load of self-assessment.
 * Users intuitively read "more fill = more focus" without needing a scale explanation.
 */
export default function QualityIndicator({
  quality,
  size = 16,
  showLabel = false,
  className,
}: QualityIndicatorProps) {
  const level = QUALITY_LEVELS[quality];

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <svg width={size} height={size} viewBox="0 0 16 16">
        {/* Track circle */}
        <circle cx="8" cy="8" r="7" fill="none" stroke="#bfc6d9" strokeWidth="1.5" className="dark:stroke-lavender-600" />
        {/* Fill based on quality level */}
        {quality === 1 && (
          /* Scattered — just the outline, no fill */
          null
        )}
        {quality === 2 && (
          /* Distracted — quarter fill from bottom */
          <path
            d="M8 15 A7 7 0 0 1 1 8 L8 8 Z"
            fill="#808eb3"
            className="dark:fill-baltic-400"
          />
        )}
        {quality === 3 && (
          /* Focused — half fill */
          <path
            d="M8 1 A7 7 0 0 0 8 15 L8 8 Z"
            fill="#60729f"
            className="dark:fill-baltic-400"
          />
        )}
        {quality === 4 && (
          /* Deep focus — full fill */
          <circle cx="8" cy="8" r="6" fill="#4d5b80" className="dark:fill-baltic-400" />
        )}
      </svg>
      {showLabel && (
        <span className="text-xs text-steel-500 dark:text-steel-400">{level.label}</span>
      )}
    </div>
  );
}

interface QualitySelectorProps {
  value: FocusQuality | null;
  onChange: (quality: FocusQuality) => void;
  size?: number;
}

/**
 * Interactive quality selector — 4 circles in a row.
 * Clicking selects, label appears below selected state.
 * Design rationale: 4 states is the sweet spot — fewer is too coarse, more causes decision fatigue.
 */
export function QualitySelector({ value, onChange, size = 32 }: QualitySelectorProps) {
  const qualities: FocusQuality[] = [1, 2, 3, 4];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        {qualities.map((q) => {
          const selected = value === q;
          const strokeColor = selected ? "#60729f" : "#c5c9d3";
          const fillColor = selected ? "#4d5b80" : "#c5c9d3";
          return (
            <button
              key={q}
              type="button"
              onClick={() => onChange(q)}
              aria-label={QUALITY_LEVELS[q].label}
              aria-pressed={selected}
              className={cn(
                "relative rounded-full p-2 transition-[background-color,transform] duration-150 ease-out press",
                selected
                  ? "bg-baltic-50 ring-1 ring-baltic-400/40"
                  : "hover:bg-lavender-50"
              )}
            >
              <svg width={size} height={size} viewBox="0 0 16 16">
                <circle
                  cx="8" cy="8" r="7" fill="none"
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />
                {q === 2 && (
                  <path d="M8 15 A7 7 0 0 1 1 8 L8 8 Z" fill={fillColor} />
                )}
                {q === 3 && (
                  <path d="M8 1 A7 7 0 0 0 8 15 L8 8 Z" fill={fillColor} />
                )}
                {q === 4 && (
                  <circle cx="8" cy="8" r="6" fill={fillColor} />
                )}
              </svg>
            </button>
          );
        })}
      </div>
      <div className="h-5">
        {value && (
          <p className="text-xs text-baltic-700 text-center">
            <span className="font-medium">{QUALITY_LEVELS[value].label}</span>
            <span className="text-steel-400"> · {QUALITY_LEVELS[value].description}</span>
          </p>
        )}
      </div>
    </div>
  );
}
