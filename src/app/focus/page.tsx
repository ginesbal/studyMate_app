"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useFocus, useSubjects } from "@/lib/contexts";
import { SUBJECTS, type SubjectKey, type FocusQuality } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { QualitySelector } from "@/components/ui/QualityIndicator";
import DurationPicker from "@/components/ui/DurationPicker";
import SubjectSelector from "@/components/ui/SubjectSelector";

const TopologyBg = dynamic(() => import("@/components/ui/TopologyBg"), { ssr: false });

type TimerState = "idle" | "running" | "paused" | "done" | "reflecting";

// Topology backdrop presets — the line color is drawn from the shared app
// palette so the focus page sits cohesively beside the rest of the app.
// The mesh background stays on baltic-50 (the app surface) for every preset;
// only the line color changes. The choice persists in localStorage.
type TopoPresetKey = "baltic" | "ash" | "lavender" | "cream";

const TOPO_BG = 0xeff1f5; // baltic-50

const TOPO_PRESETS: { key: TopoPresetKey; label: string; color: number; hex: string }[] = [
  { key: "baltic",   label: "Baltic",   color: 0x808eb3, hex: "#808eb3" },
  { key: "ash",      label: "Ash",      color: 0x76946b, hex: "#76946b" },
  { key: "lavender", label: "Lavender", color: 0x6e7891, hex: "#6e7891" },
  { key: "cream",    label: "Cream",    color: 0x949b31, hex: "#949b31" },
];

const TOPO_STORAGE_KEY = "aim_focus_topo";

const MUSIC_OPTIONS = [
  { id: "brown",  label: "Brown noise",  desc: "Low, warm, hush" },
  { id: "pink",   label: "Pink noise",   desc: "Balanced static" },
  { id: "rain",   label: "Rain",         desc: "Wet pavement, soft" },
  { id: "lofi",   label: "Lofi loop",    desc: "Tape, no vocals" },
] as const;

export default function FocusPage() {
  const router = useRouter();
  const { addSession } = useFocus();
  const { getSubject } = useSubjects();

  const [duration, setDuration] = useState(25);
  const [subject, setSubject] = useState<string | null>(null);
  const [task, setTask] = useState("");
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [reflectionQuality, setReflectionQuality] = useState<FocusQuality | null>(null);
  const [reflectionNote, setReflectionNote] = useState("");
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  const [musicOpen, setMusicOpen] = useState(false);
  const musicMenuRef = useRef<HTMLDivElement>(null);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const backdropMenuRef = useRef<HTMLDivElement>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  const [topoPreset, setTopoPreset] = useState<TopoPresetKey>(() => {
    if (typeof window === "undefined") return "baltic";
    const saved = window.localStorage.getItem(TOPO_STORAGE_KEY);
    return TOPO_PRESETS.some((p) => p.key === saved) ? (saved as TopoPresetKey) : "baltic";
  });
  const activePreset = TOPO_PRESETS.find((p) => p.key === topoPreset) ?? TOPO_PRESETS[0];

  const selectPreset = useCallback((key: TopoPresetKey) => {
    setTopoPreset(key);
    if (typeof window !== "undefined") window.localStorage.setItem(TOPO_STORAGE_KEY, key);
  }, []);

  const totalSeconds = duration * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const subjectColor = (() => {
    if (!subject) return "#9faac6";
    const userSub = getSubject(subject);
    if (userSub) return userSub.color;
    const legacySub = SUBJECTS[subject as SubjectKey];
    return legacySub?.color || "#9faac6";
  })();

  const subjectLabel = (() => {
    if (!subject) return null;
    const userSub = getSubject(subject);
    if (userSub) return userSub.label;
    const legacySub = SUBJECTS[subject as SubjectKey];
    return legacySub?.label || subject;
  })();

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setTimerState("running");
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setTimerState("done");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    clearTimer();
    setTimerState("paused");
  }, [clearTimer]);

  const resetToIdle = useCallback(() => {
    clearTimer();
    setTimerState("idle");
    setSecondsLeft(duration * 60);
    setReflectionQuality(null);
    setReflectionNote("");
  }, [clearTimer, duration]);

  const exitToDashboard = useCallback(() => {
    clearTimer();
    router.push("/dashboard");
  }, [clearTimer, router]);

  // Guard against losing an in-progress or unsaved session: the first click
  // during a live session arms a confirm, the second actually leaves.
  const handleExit = useCallback(() => {
    if (timerState === "idle" || confirmExit) {
      exitToDashboard();
      return;
    }
    setConfirmExit(true);
  }, [timerState, confirmExit, exitToDashboard]);

  const addFiveMinutes = useCallback(() => {
    setDuration((d) => Math.min(d + 5, 240));
    setSecondsLeft((s) => s + 5 * 60);
  }, []);

  // End the session now and move to reflection, recording the actual time
  // focused — partial when finishing early, full when the timer completed.
  const endSession = useCallback(() => {
    clearTimer();
    const elapsed = Math.max(Math.round((totalSeconds - secondsLeft) / 60), 1);
    setElapsedMinutes(elapsed);
    setTimerState("reflecting");
  }, [clearTimer, totalSeconds, secondsLeft]);

  const saveWithReflection = useCallback(() => {
    if (!subject) return;
    addSession(
      subject,
      elapsedMinutes,
      reflectionQuality
        ? { quality: reflectionQuality, ...(reflectionNote.trim() ? { note: reflectionNote.trim() } : {}) }
        : undefined,
      task
    );
    setTask("");
    resetToIdle();
  }, [subject, elapsedMinutes, reflectionQuality, reflectionNote, task, addSession, resetToIdle]);

  const skipReflection = useCallback(() => {
    if (!subject) return;
    addSession(subject, elapsedMinutes, undefined, task);
    setTask("");
    resetToIdle();
  }, [subject, elapsedMinutes, task, addSession, resetToIdle]);

  // Log a completed session straight from the done screen, skipping the
  // reflection step. The work happened — record it regardless.
  const finishWithoutReflection = useCallback(() => {
    if (!subject) return;
    const elapsed = Math.max(Math.round((totalSeconds - secondsLeft) / 60), 1);
    addSession(subject, elapsed, undefined, task);
    setTask("");
    resetToIdle();
  }, [subject, totalSeconds, secondsLeft, task, addSession, resetToIdle]);

  // Keep secondsLeft in sync when duration changes during setup
  useEffect(() => {
    if (timerState === "idle") {
      setSecondsLeft(duration * 60);
    }
  }, [duration, timerState]);

  // Clean up interval on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  // Disarm the exit confirm if the user doesn't follow through
  useEffect(() => {
    if (!confirmExit) return;
    const t = setTimeout(() => setConfirmExit(false), 3000);
    return () => clearTimeout(t);
  }, [confirmExit]);

  // Top-bar popovers (music, backdrop) — close on outside click + Esc
  useEffect(() => {
    if (!musicOpen && !backdropOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (musicMenuRef.current && !musicMenuRef.current.contains(t)) setMusicOpen(false);
      if (backdropMenuRef.current && !backdropMenuRef.current.contains(t)) setBackdropOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMusicOpen(false);
        setBackdropOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [musicOpen, backdropOpen]);

  const canBegin = subject !== null;
  const pillSubtitle = task.trim() || subjectLabel || "Ready to focus";

  return (
    <div className="fixed inset-0 z-50 focus-canvas focus-canvas-enter overflow-hidden">
      {/* Animated topology mesh — palette-tinted, light surface. */}
      <div className="absolute inset-0" aria-hidden>
        <TopologyBg color={activePreset.color} backgroundColor={TOPO_BG} />
      </div>

      {/* ── Top-left: context pill — only once a session is underway ── */}
      {timerState !== "idle" && (
        <header className="absolute top-6 left-6 z-10 focus-stage-enter">
          <div className="focus-panel rounded-full px-4 py-2 flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.22em] text-steel-400">
              {timerState === "running" && "Focusing on"}
              {timerState === "paused" && "Paused"}
              {timerState === "done" && "Session complete"}
              {timerState === "reflecting" && "Reflecting"}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-300"
                style={{ backgroundColor: subjectColor }}
                aria-hidden
              />
              <span className="text-sm text-baltic-700 truncate max-w-[22ch]">
                {pillSubtitle}
              </span>
            </div>
          </div>
        </header>
      )}

      {/* ── Top-right: backdrop + music + exit ── */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        {/* Backdrop color */}
        <div className="relative" ref={backdropMenuRef}>
          <button
            onClick={() => { setBackdropOpen((v) => !v); setMusicOpen(false); }}
            aria-label="Backdrop color"
            aria-expanded={backdropOpen}
            title="Backdrop color"
            className="focus-btn !p-0 w-10 h-10 !rounded-full"
          >
            <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: activePreset.hex }} />
          </button>
          {backdropOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-2xl overflow-hidden bg-white border border-lavender-200 shadow-[0_16px_36px_-12px_rgba(38,45,64,0.28)] dropdown-enter"
              style={{ transformOrigin: "top right" }}
              role="menu"
            >
              <div className="px-4 pt-3 pb-2 border-b border-lavender-100">
                <p className="text-[10px] uppercase tracking-[0.2em] text-steel-400">Backdrop</p>
              </div>
              <ul className="py-1">
                {TOPO_PRESETS.map((p) => (
                  <li key={p.key}>
                    <button
                      onClick={() => { selectPreset(p.key); setBackdropOpen(false); }}
                      role="menuitemradio"
                      aria-checked={topoPreset === p.key}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-lavender-50 transition-colors duration-150"
                    >
                      <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.hex }} />
                      <span className="text-sm text-baltic-700 flex-1 text-left">{p.label}</span>
                      {topoPreset === p.key && (
                        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="text-baltic-600 flex-shrink-0">
                          <path d="M2.5 7.5L6 11l5.5-7" />
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Music */}
        <div className="relative" ref={musicMenuRef}>
          <button
            onClick={() => { setMusicOpen((v) => !v); setBackdropOpen(false); }}
            aria-label="Ambient sound"
            aria-expanded={musicOpen}
            className="focus-btn !p-0 w-10 h-10 !rounded-full"
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 12V3l7-1v9" />
              <circle cx="4.5" cy="12" r="1.5" />
              <circle cx="11.5" cy="11" r="1.5" />
            </svg>
          </button>
          {musicOpen && (
            <div
              className="absolute right-0 mt-2 w-72 rounded-2xl overflow-hidden bg-white border border-lavender-200 shadow-[0_16px_36px_-12px_rgba(38,45,64,0.28)] dropdown-enter"
              style={{ transformOrigin: "top right" }}
              role="menu"
            >
              <div className="px-4 pt-3 pb-2 border-b border-lavender-100">
                <p className="text-[10px] uppercase tracking-[0.2em] text-steel-400">Ambient</p>
              </div>
              <ul>
                {MUSIC_OPTIONS.map((opt) => (
                  <li key={opt.id}>
                    <button
                      disabled
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left disabled:cursor-not-allowed"
                      role="menuitem"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-steel-500 truncate">{opt.label}</p>
                        <p className="text-[11px] text-steel-400 truncate">{opt.desc}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.15em] text-steel-400 border border-lavender-200 rounded-full px-1.5 py-0.5 flex-shrink-0">
                        Soon
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-2.5 border-t border-lavender-100 text-[11px] text-steel-400">
                Ambient sound arrives in a later update.
              </div>
            </div>
          )}
        </div>

        {/* Exit */}
        <button
          onClick={handleExit}
          aria-label={confirmExit ? "Confirm exit — this session won't be saved" : "Exit focus mode"}
          className={cn("focus-btn !px-3 !py-2", confirmExit && "!text-red-600 !border-red-300")}
        >
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
          <span className="text-sm whitespace-nowrap">{confirmExit ? "Discard & leave?" : "Exit"}</span>
        </button>
      </div>

      {/* ── Center stage ── */}
      <main className="absolute inset-0 flex items-center justify-center px-6">
        {timerState === "idle" && (
          <SetupStage
            duration={duration}
            onDurationChange={setDuration}
            subject={subject}
            onSubjectChange={setSubject}
            task={task}
            onTaskChange={setTask}
            canBegin={canBegin}
            onBegin={startTimer}
          />
        )}

        {(timerState === "running" || timerState === "paused" || timerState === "done") && (
          <SessionStage
            timerState={timerState}
            minutes={minutes}
            seconds={seconds}
            duration={duration}
            progress={progress}
            accentColor={subjectColor}
            onPause={pauseTimer}
            onResume={startTimer}
            onAddFive={addFiveMinutes}
            onFinish={endSession}
            onDiscard={resetToIdle}
            onSkipReflection={finishWithoutReflection}
          />
        )}

        {timerState === "reflecting" && (
          <ReflectionStage
            elapsedMinutes={elapsedMinutes}
            subjectLabel={subjectLabel}
            subjectColor={subjectColor}
            task={task}
            quality={reflectionQuality}
            onQualityChange={setReflectionQuality}
            note={reflectionNote}
            onNoteChange={setReflectionNote}
            onSave={saveWithReflection}
            onSkip={skipReflection}
          />
        )}
      </main>

      {/* ── Bottom-center: mantra ── */}
      <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <p className="font-script text-base text-baltic-300 select-none">
          no tabs, no shortcuts, one thing
        </p>
      </footer>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Setup stage — duration ring, subject, task, backdrop, begin
// ───────────────────────────────────────────────────────────────

interface SetupStageProps {
  duration: number;
  onDurationChange: (n: number) => void;
  subject: string | null;
  onSubjectChange: (s: string | null) => void;
  task: string;
  onTaskChange: (s: string) => void;
  canBegin: boolean;
  onBegin: () => void;
}

function SetupStage({
  duration, onDurationChange,
  subject, onSubjectChange,
  task, onTaskChange,
  canBegin, onBegin,
}: SetupStageProps) {
  const [showTask, setShowTask] = useState(false);
  const showTaskInput = showTask || task.length > 0;

  return (
    <div className="focus-stage-enter w-full max-w-sm">
      {/* Calm solid card so the moving mesh stops competing with the inputs */}
      <div className="rounded-3xl bg-white border border-lavender-200 shadow-[0_18px_44px_-14px_rgba(38,45,64,0.22)] p-7">
        {/* How long */}
        <DurationPicker value={duration} onChange={onDurationChange} />

        <div className="h-px bg-lavender-100 my-6" />

        {/* What */}
        <SubjectSelector value={subject} onChange={onSubjectChange} />

        {/* Optional note — disclosed on demand to keep the default view calm */}
        <div className="mt-3">
          {showTaskInput ? (
            <input
              type="text"
              autoFocus={showTask && task.length === 0}
              value={task}
              onChange={(e) => onTaskChange(e.target.value)}
              placeholder="What are you working on?"
              maxLength={60}
              className="w-full px-4 py-2 text-sm rounded-full bg-white border border-lavender-200 text-baltic-800 placeholder:text-steel-400 outline-none focus:border-baltic-400 focus:ring-2 focus:ring-baltic-400/20 transition-colors duration-150"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowTask(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-steel-400 hover:text-baltic-600 transition-colors duration-150"
            >
              <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <path d="M6 2v8M2 6h8" />
              </svg>
              Add what you&apos;re working on
            </button>
          )}
        </div>

        {/* Begin */}
        <button
          onClick={onBegin}
          disabled={!canBegin}
          className="mt-6 w-full focus-btn focus-btn-primary !py-3 text-[15px]"
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <polygon points="3,2 12,7 3,12" fill="currentColor" />
          </svg>
          Begin focusing
        </button>

        {!canBegin && (
          <p className="mt-2.5 text-center text-xs text-steel-400">Pick a subject to begin</p>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Session stage — countdown ring + controls
// ───────────────────────────────────────────────────────────────

interface SessionStageProps {
  timerState: "running" | "paused" | "done";
  minutes: number;
  seconds: number;
  duration: number;
  progress: number;
  accentColor: string;
  onPause: () => void;
  onResume: () => void;
  onAddFive: () => void;
  onFinish: () => void;
  onDiscard: () => void;
  onSkipReflection: () => void;
}

function SessionStage({
  timerState, minutes, seconds, duration, progress, accentColor,
  onPause, onResume, onAddFive, onFinish, onDiscard, onSkipReflection,
}: SessionStageProps) {
  const size = 320;
  const cx = size / 2;
  const ringR = 140;
  const circ = 2 * Math.PI * ringR;
  const isDone = timerState === "done";
  const isActive = timerState === "running" || timerState === "paused";
  const accent = isDone ? "#76946b" : accentColor;
  const offset = circ * (1 - progress / 100);

  // Position of the glowing frontier dot at the leading edge of the arc.
  const headAngle = (-90 + (progress / 100) * 360) * (Math.PI / 180);
  const headX = cx + ringR * Math.cos(headAngle);
  const headY = cx + ringR * Math.sin(headAngle);
  const showHead = isActive && progress > 0.5;

  return (
    <div className="focus-stage-enter flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Frosted core — gives the timer a crafted body over the moving mesh
            and keeps the countdown legible without a hard card edge. */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div
            className="rounded-full"
            style={{
              width: 244,
              height: 244,
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.65)",
              boxShadow:
                "0 1px 2px rgba(38,45,64,0.05), 0 22px 48px -22px rgba(38,45,64,0.30), inset 0 1px 2px rgba(255,255,255,0.7)",
            }}
          />
        </div>

        {/* Minimal hour ticks — faint watch-face character, 12 only. */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 - 90) * (Math.PI / 180);
            const r1 = 118;
            const r2 = i % 3 === 0 ? 109 : 113;
            return (
              <line
                key={i}
                x1={cx + r1 * Math.cos(a)} y1={cx + r1 * Math.sin(a)}
                x2={cx + r2 * Math.cos(a)} y2={cx + r2 * Math.sin(a)}
                stroke="#b8bdcc"
                strokeWidth={i % 3 === 0 ? 1.5 : 1}
                strokeLinecap="round"
                className="focus-tick-enter"
                style={{ animationDelay: `${i * 22}ms`, opacity: 0.55 }}
              />
            );
          })}
        </svg>

        {/* Progress ring — bold rounded arc in the subject's colour. */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
          <defs>
            <linearGradient id="focusArc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accent} stopOpacity={0.45} />
              <stop offset="100%" stopColor={accent} stopOpacity={1} />
            </linearGradient>
          </defs>
          <circle cx={cx} cy={cx} r={ringR} fill="none" stroke="#e4e6ec" strokeWidth={3} />
          <circle
            cx={cx} cy={cx} r={ringR}
            fill="none"
            stroke="url(#focusArc)"
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 900ms linear" }}
          />
        </svg>

        {/* Glowing frontier dot — the live edge of progress. */}
        {showHead && (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 pointer-events-none" aria-hidden>
            <circle
              cx={headX} cy={headY} r={5.5}
              fill={accent}
              style={{ filter: `drop-shadow(0 0 7px ${accent})` }}
              className={timerState === "running" ? "timer-pulse" : ""}
            />
            <circle cx={headX} cy={headY} r={2} fill="#ffffff" opacity={0.9} />
          </svg>
        )}

        {/* Center readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p
            className={cn(
              "text-7xl font-extralight tracking-tighter tabular-nums leading-none",
              isDone ? "text-ash-600" : "text-baltic-800",
            )}
            aria-live="polite"
          >
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-steel-400 tabular-nums">
            {isDone ? "Complete" : timerState === "paused" ? "Paused" : `of ${String(duration).padStart(2, "0")}:00`}
          </p>
          {isActive && (
            <button
              onClick={onAddFive}
              className="mt-3.5 inline-flex items-center gap-1 rounded-full border border-lavender-200 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-steel-500 hover:border-baltic-300 hover:text-baltic-600 transition-colors duration-150 press"
            >
              <svg width={10} height={10} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
                <path d="M6 2v8M2 6h8" />
              </svg>
              <span className="tabular-nums">5 min</span>
            </button>
          )}
        </div>
      </div>

      {/* Controls — one primary toggle plus Finish; Discard tucked beneath. */}
      <div className="flex items-center gap-2.5 mt-9">
        {timerState === "running" && (
          <button onClick={onPause} className="focus-btn focus-btn-primary !px-6">
            <svg width={12} height={12} viewBox="0 0 12 12" fill="currentColor">
              <rect x="2.5" y="2" width="2.5" height="8" rx="0.5" />
              <rect x="7" y="2" width="2.5" height="8" rx="0.5" />
            </svg>
            Pause
          </button>
        )}
        {timerState === "paused" && (
          <button onClick={onResume} className="focus-btn focus-btn-primary !px-6">
            <svg width={12} height={12} viewBox="0 0 12 12" fill="currentColor">
              <polygon points="3,2 10,6 3,10" />
            </svg>
            Resume
          </button>
        )}
        {isActive && (
          <button onClick={onFinish} className="focus-btn">
            Finish
          </button>
        )}
        {isDone && (
          <>
            <button onClick={onFinish} className="focus-btn focus-btn-primary !px-6">
              Reflect on session
            </button>
            <button onClick={onSkipReflection} className="focus-btn">
              Skip
            </button>
          </>
        )}
      </div>

      {/* Discard — quiet and separated; abandons the session without logging. */}
      {isActive && (
        <div className="mt-3">
          <DiscardButton onConfirm={onDiscard} />
        </div>
      )}
    </div>
  );
}

// Discard control — a two-step confirm so a misclick can't throw away an
// in-progress session. Disarms itself after a few seconds.
function DiscardButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      onClick={() => { if (armed) onConfirm(); else setArmed(true); }}
      className={cn(
        "px-3 py-2 rounded-full text-sm transition-colors duration-150 press",
        armed ? "text-red-600 font-medium" : "text-steel-400 hover:text-red-600"
      )}
    >
      {armed ? "Confirm discard" : "Discard"}
    </button>
  );
}

// ───────────────────────────────────────────────────────────────
// Reflection stage
// ───────────────────────────────────────────────────────────────

interface ReflectionStageProps {
  elapsedMinutes: number;
  subjectLabel: string | null;
  subjectColor: string;
  task: string;
  quality: FocusQuality | null;
  onQualityChange: (q: FocusQuality) => void;
  note: string;
  onNoteChange: (s: string) => void;
  onSave: () => void;
  onSkip: () => void;
}

function ReflectionStage({
  elapsedMinutes, subjectLabel, subjectColor, task,
  quality, onQualityChange, note, onNoteChange,
  onSave, onSkip,
}: ReflectionStageProps) {
  return (
    <div className="focus-stage-enter rounded-3xl bg-white border border-lavender-200 shadow-[0_18px_44px_-14px_rgba(38,45,64,0.22)] p-8 w-full max-w-sm flex flex-col items-center">
      {/* Session summary */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subjectColor }} />
        <span className="text-xs text-steel-500 tabular-nums">
          {formatTime(elapsedMinutes)}{subjectLabel ? ` · ${subjectLabel}` : ""}
        </span>
      </div>
      {task.trim() ? (
        <p className="text-[11px] text-steel-400 mb-5 italic truncate max-w-full">
          {task.trim()}
        </p>
      ) : (
        <div className="mb-5" />
      )}

      <h2 className="text-lg font-medium text-baltic-800 mb-6 tracking-tight">
        How focused were you?
      </h2>

      <QualitySelector value={quality} onChange={onQualityChange} size={36} />

      <div className="w-full mt-6">
        <input
          type="text"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          maxLength={80}
          placeholder="What clicked? (optional)"
          className="w-full px-4 py-2 text-sm text-center rounded-full bg-white border border-lavender-200 text-baltic-800 placeholder:text-steel-400 outline-none focus:border-baltic-400 focus:ring-2 focus:ring-baltic-400/20 transition-colors duration-150"
        />
      </div>

      <div className="flex items-center gap-2 mt-6">
        <button
          onClick={onSave}
          disabled={!quality}
          className="focus-btn focus-btn-primary !px-5"
        >
          Save reflection
        </button>
        <button onClick={onSkip} className="focus-btn">
          Skip
        </button>
      </div>
    </div>
  );
}
