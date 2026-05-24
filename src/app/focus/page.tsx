"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFocus, useSubjects } from "@/lib/contexts";
import { SUBJECTS, type SubjectKey, type FocusQuality } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { QualitySelector } from "@/components/ui/QualityIndicator";
import DurationPicker from "@/components/ui/DurationPicker";
import SubjectSelector from "@/components/ui/SubjectSelector";

type TimerState = "idle" | "running" | "paused" | "done" | "reflecting";

const MUSIC_OPTIONS = [
  { id: "brown",  label: "Brown noise",  desc: "Low, warm, hush" },
  { id: "pink",   label: "Pink noise",   desc: "Balanced static" },
  { id: "rain",   label: "Rain",         desc: "Wet pavement, soft" },
  { id: "lofi",   label: "Lofi loop",    desc: "Tape, no vocals" },
] as const;

export default function FocusPage() {
  const router = useRouter();
  const { addSession, sessions, todayMinutes } = useFocus();
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

  const totalSeconds = duration * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const subjectColor = (() => {
    if (!subject) return "rgba(255,255,255,0.45)";
    const userSub = getSubject(subject);
    if (userSub) return userSub.color;
    const legacySub = SUBJECTS[subject as SubjectKey];
    return legacySub?.color || "rgba(255,255,255,0.45)";
  })();

  const subjectLabel = (() => {
    if (!subject) return null;
    const userSub = getSubject(subject);
    if (userSub) return userSub.label;
    const legacySub = SUBJECTS[subject as SubjectKey];
    return legacySub?.label || subject;
  })();

  const todaySessionCount = (() => {
    const today = new Date().toDateString();
    return sessions.filter((s) => new Date(s.completedAt).toDateString() === today).length;
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

  const addFiveMinutes = useCallback(() => {
    setDuration((d) => Math.min(d + 5, 240));
    setSecondsLeft((s) => s + 5 * 60);
  }, []);

  const beginReflection = useCallback(() => {
    const elapsed = Math.max(Math.round((totalSeconds - secondsLeft) / 60), 1);
    setElapsedMinutes(elapsed);
    setTimerState("reflecting");
  }, [totalSeconds, secondsLeft]);

  const saveWithReflection = useCallback(() => {
    if (!subject) return;
    addSession(
      subject,
      elapsedMinutes,
      reflectionQuality
        ? { quality: reflectionQuality, ...(reflectionNote.trim() ? { note: reflectionNote.trim() } : {}) }
        : undefined
    );
    setTask("");
    resetToIdle();
  }, [subject, elapsedMinutes, reflectionQuality, reflectionNote, addSession, resetToIdle]);

  const skipReflection = useCallback(() => {
    if (!subject) return;
    addSession(subject, elapsedMinutes);
    setTask("");
    resetToIdle();
  }, [subject, elapsedMinutes, addSession, resetToIdle]);

  // Log a completed session straight from the done screen, skipping the
  // reflection step. The work happened — record it regardless.
  const finishWithoutReflection = useCallback(() => {
    if (!subject) return;
    const elapsed = Math.max(Math.round((totalSeconds - secondsLeft) / 60), 1);
    addSession(subject, elapsed);
    setTask("");
    resetToIdle();
  }, [subject, totalSeconds, secondsLeft, addSession, resetToIdle]);

  // Keep secondsLeft in sync when duration changes during setup
  useEffect(() => {
    if (timerState === "idle") {
      setSecondsLeft(duration * 60);
    }
  }, [duration, timerState]);

  // Clean up interval on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  // Music popover — close on outside click + Esc
  useEffect(() => {
    if (!musicOpen) return;
    const onClick = (e: MouseEvent) => {
      if (musicMenuRef.current && !musicMenuRef.current.contains(e.target as Node)) {
        setMusicOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMusicOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [musicOpen]);

  const canBegin = subject !== null;
  const pillSubtitle = task.trim() || subjectLabel || "Ready to focus";

  return (
    <div className="fixed inset-0 z-50 focus-canvas focus-canvas-enter overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 focus-topology pointer-events-none" aria-hidden />
      <div className="absolute inset-0 focus-vignette pointer-events-none" aria-hidden />

      {/* ── Top-left: context pill ── */}
      <header className="absolute top-6 left-6 z-10">
        <div className="focus-panel rounded-full px-4 py-2 flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.22em] text-white/45">
            {timerState === "idle" && "Ready"}
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
            <span className="text-sm text-white/90 truncate max-w-[22ch]">
              {pillSubtitle}
            </span>
          </div>
        </div>
      </header>

      {/* ── Top-right: music + exit ── */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        {/* Music */}
        <div className="relative" ref={musicMenuRef}>
          <button
            onClick={() => setMusicOpen((v) => !v)}
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
              className="absolute right-0 mt-2 w-72 rounded-2xl overflow-hidden dropdown-enter"
              style={{
                backgroundColor: "rgba(18, 22, 30, 0.92)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.6)",
                transformOrigin: "top right",
              }}
              role="menu"
            >
              <div className="px-4 pt-3 pb-2 border-b border-white/8">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Ambient</p>
              </div>
              <ul>
                {MUSIC_OPTIONS.map((opt) => (
                  <li key={opt.id}>
                    <button
                      disabled
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left disabled:cursor-not-allowed group"
                      role="menuitem"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-white/55 truncate">{opt.label}</p>
                        <p className="text-[11px] text-white/30 truncate">{opt.desc}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.15em] text-white/35 border border-white/10 rounded-full px-1.5 py-0.5 flex-shrink-0">
                        Soon
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-2.5 border-t border-white/8 text-[11px] text-white/40 leading-relaxed">
                Sound is on the roadmap. The shape is here; the audio drops in later.
              </div>
            </div>
          )}
        </div>

        {/* Exit */}
        <button
          onClick={exitToDashboard}
          aria-label="Exit focus mode"
          className="focus-btn !px-3 !py-2"
        >
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
          <span className="text-sm">Exit</span>
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
            onPause={pauseTimer}
            onResume={startTimer}
            onReset={resetToIdle}
            onAddFive={addFiveMinutes}
            onReflect={beginReflection}
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
        <p className="font-script text-base text-white/30 select-none">
          no tabs, no shortcuts, one thing
        </p>
      </footer>

      {/* ── Bottom-right: today readout ── */}
      <aside className="absolute bottom-6 right-6 z-10 text-right pointer-events-none select-none">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Today</p>
        <p className="text-xs text-white/60 tabular-nums mt-0.5">
          {todaySessionCount === 0 ? "First session" : `Session ${todaySessionCount + (timerState !== "idle" ? 1 : 0)}`}
          <span className="text-white/30"> · </span>
          {formatTime(todayMinutes)}
        </p>
      </aside>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Setup stage — duration ring, subject, task, begin
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
  return (
    <div className="focus-stage-enter flex flex-col items-center w-full max-w-md">
      {/* Decorative concentric ring with duration in center */}
      <div className="relative" style={{ width: 320, height: 320 }}>
        <svg width={320} height={320} viewBox="0 0 320 320" className="absolute inset-0">
          {/* Outer hairline */}
          <circle cx="160" cy="160" r="156" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          {/* 60 tick marks */}
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i * 6 - 90) * (Math.PI / 180);
            const isMajor = i % 5 === 0;
            const outerR = 156;
            const innerR = isMajor ? 144 : 150;
            const x1 = 160 + innerR * Math.cos(angle);
            const y1 = 160 + innerR * Math.sin(angle);
            const x2 = 160 + outerR * Math.cos(angle);
            const y2 = 160 + outerR * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isMajor ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.12)"}
                strokeWidth={isMajor ? 1.25 : 0.6}
                strokeLinecap="round"
              />
            );
          })}
          {/* Duration indicator arc — proportional to chosen length */}
          {(() => {
            const pct = Math.min(duration / 120, 1);
            const r = 132;
            const circumference = 2 * Math.PI * r;
            const offset = circumference * (1 - pct);
            return (
              <circle
                cx="160" cy="160" r={r}
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="1"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="-rotate-90 origin-center"
                style={{ transition: "stroke-dashoffset 400ms var(--ease-out)" }}
              />
            );
          })()}
          {/* Inner hairline */}
          <circle cx="160" cy="160" r="115" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <DurationPicker value={duration} onChange={onDurationChange} />
        </div>
      </div>

      {/* Subject row */}
      <div className="w-full mt-7">
        <SubjectSelector value={subject} onChange={onSubjectChange} />
      </div>

      {/* Task field — optional one-liner powering the FOCUSING ON pill */}
      <div className="w-full mt-3">
        <div className="relative">
          <input
            type="text"
            value={task}
            onChange={(e) => onTaskChange(e.target.value)}
            placeholder="What are you working on? (optional)"
            maxLength={60}
            className="w-full px-4 py-2 text-sm rounded-full bg-white/[0.04] border border-white/12 text-white placeholder:text-white/40 outline-none focus:bg-white/[0.07] focus:border-white/30 transition-colors duration-150"
          />
        </div>
      </div>

      {/* Begin */}
      <button
        onClick={onBegin}
        disabled={!canBegin}
        className="mt-6 focus-btn focus-btn-primary !px-7 !py-3 text-[15px]"
      >
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3,2 12,7 3,12" fill="currentColor" stroke="none" />
        </svg>
        Begin focusing
      </button>

      {!canBegin && (
        <p className="mt-3 text-xs text-white/40">Pick a subject to begin</p>
      )}
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
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onAddFive: () => void;
  onReflect: () => void;
  onSkipReflection: () => void;
}

function SessionStage({
  timerState, minutes, seconds, duration, progress,
  onPause, onResume, onReset, onAddFive, onReflect, onSkipReflection,
}: SessionStageProps) {
  const size = 320;
  const ringR = 144;
  const ringStroke = 1.5;
  const ringCircumference = 2 * Math.PI * ringR;
  const ringOffset = ringCircumference * (1 - progress / 100);
  const isDone = timerState === "done";

  return (
    <div className="focus-stage-enter flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Tick marks */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i * 6 - 90) * (Math.PI / 180);
            const isMajor = i % 5 === 0;
            const outerR = 156;
            const innerR = isMajor ? 146 : 151;
            const cx = size / 2;
            const x1 = cx + innerR * Math.cos(angle);
            const y1 = cx + innerR * Math.sin(angle);
            const x2 = cx + outerR * Math.cos(angle);
            const y2 = cx + outerR * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isMajor ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.10)"}
                strokeWidth={isMajor ? 1.25 : 0.6}
                strokeLinecap="round"
                className="focus-tick-enter"
                style={{ animationDelay: `${i * 8}ms` }}
              />
            );
          })}

          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={ringR}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={ringStroke}
          />

          {/* Progress arc */}
          <circle
            cx={size / 2} cy={size / 2} r={ringR}
            fill="none"
            stroke={isDone ? "rgba(199, 206, 100, 0.85)" : "rgba(255, 255, 255, 0.95)"}
            strokeWidth={ringStroke}
            strokeLinecap="round"
            strokeDasharray={ringCircumference}
            strokeDashoffset={ringOffset}
            className="-rotate-90 origin-center"
            style={{ transition: "stroke-dashoffset 900ms linear, stroke 300ms ease" }}
          />
        </svg>

        {/* Sweep hand — only while actively timing */}
        <div
          className={cn(
            "absolute inset-0 pointer-events-none",
            (timerState === "running" || timerState === "paused") && "sweep-active",
          )}
          style={{
            opacity: timerState === "running" || timerState === "paused" ? 1 : 0,
            animationPlayState: timerState === "paused" ? "paused" : "running",
            transition: "opacity 0.3s ease",
          }}
          aria-hidden
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <line
              x1={size / 2} y1={size / 2} x2={size / 2} y2={20}
              stroke="rgba(255,255,255,0.40)"
              strokeWidth={1}
              strokeLinecap="round"
            />
            <circle cx={size / 2} cy={size / 2} r={2} fill="rgba(255,255,255,0.55)" />
          </svg>
        </div>

        {/* Center readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p
            className={cn(
              "text-7xl font-extralight tracking-tighter tabular-nums leading-none",
              isDone ? "text-white/75" : "text-white",
            )}
            aria-live="polite"
          >
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-white/40 tabular-nums">
            {isDone
              ? "Complete"
              : `/ ${String(duration).padStart(2, "0")}:00 · ${timerState === "paused" ? "Paused" : "Focusing"}`
            }
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-8">
        {timerState === "running" && (
          <>
            <button onClick={onPause} className="focus-btn">
              <svg width={12} height={12} viewBox="0 0 12 12" fill="currentColor">
                <rect x="2.5" y="2" width="2.5" height="8" rx="0.5" />
                <rect x="7" y="2" width="2.5" height="8" rx="0.5" />
              </svg>
              Pause
            </button>
            <button onClick={onReset} className="focus-btn">
              <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6a4 4 0 1 0 1.5-3.1" />
                <path d="M2 1.5v3h3" />
              </svg>
              Reset
            </button>
            <button onClick={onAddFive} className="focus-btn">
              <span className="tabular-nums">+5 min</span>
            </button>
          </>
        )}
        {timerState === "paused" && (
          <>
            <button onClick={onResume} className="focus-btn focus-btn-primary">
              <svg width={12} height={12} viewBox="0 0 12 12" fill="currentColor">
                <polygon points="3,2 10,6 3,10" />
              </svg>
              Resume
            </button>
            <button onClick={onReset} className="focus-btn">
              Reset
            </button>
            <button onClick={onAddFive} className="focus-btn">
              <span className="tabular-nums">+5 min</span>
            </button>
          </>
        )}
        {timerState === "done" && (
          <>
            <button onClick={onReflect} className="focus-btn focus-btn-primary">
              Reflect on session
            </button>
            <button onClick={onSkipReflection} className="focus-btn">
              Skip reflection
            </button>
          </>
        )}
      </div>
    </div>
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
    <div className="focus-stage-enter focus-panel rounded-2xl p-8 w-full max-w-md flex flex-col items-center">
      {/* Session summary */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subjectColor }} />
        <span className="text-xs text-white/55 tabular-nums">
          {formatTime(elapsedMinutes)}{subjectLabel ? ` · ${subjectLabel}` : ""}
        </span>
      </div>
      {task.trim() && (
        <p className="text-[11px] text-white/35 mb-5 italic truncate max-w-full">
          {task.trim()}
        </p>
      )}
      {!task.trim() && <div className="mb-5" />}

      <h2 className="text-lg font-medium text-white mb-6 tracking-tight">
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
          className="w-full px-4 py-2 text-sm text-center rounded-full bg-white/[0.04] border border-white/12 text-white placeholder:text-white/35 outline-none focus:bg-white/[0.07] focus:border-white/30 transition-colors duration-150"
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
