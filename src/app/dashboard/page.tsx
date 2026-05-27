"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  usePreferences,
  useTasks,
  useFocus,
  useSubjects,
} from "@/lib/contexts";
import {
  getGreeting,
  getWeekday,
  getFormattedDate,
  formatTime,
  isOverdue,
  dayLabel,
  projectedFinishTime,
  cn,
} from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import AimLogo from "@/components/layout/AimLogo";
import { useRouter } from "next/navigation";
import type { Task, FocusSession, UserSubject } from "@/lib/types";

/* Tick the dashboard once a minute so the header date / weekday and any
   time-of-day-derived copy ("Hit your goal by 4:30 PM") stay current
   when the page is left open across day or hour boundaries. Cheap; the
   work inside is cached by useMemo. */
function useMinuteTick() {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
}

/* Defensive subject-label capitalization. Trusts user-entered case for
   labels like "iOS Development" or "C# basics" but lifts the first
   character when the entire label arrived lowercase (which happens when
   getSubject() falls back to the raw subject key on a data mismatch). */
function formatSubjectLabel(s: string | undefined | null) {
  if (!s) return "study";
  const first = s.charAt(0);
  if (first !== first.toLowerCase()) return s;
  return first.toUpperCase() + s.slice(1);
}

export default function DashboardPage() {
  const { name, isFirstVisit, dailyGoal, focusBlockMin, setName } =
    usePreferences();
  const { tasks, toggleComplete } = useTasks();
  const { todayMinutes, streak, sessions } = useFocus();
  const { getSubject } = useSubjects();
  const router = useRouter();

  useMinuteTick();

  const [showWelcome, setShowWelcome] = useState(isFirstVisit);
  const [welcomeName, setWelcomeName] = useState("");

  // Inline undo for Mark done — capture the task at the moment of
  // completion so the user has 5 seconds to take it back. Better than
  // forcing them to navigate to /tasks and toggle the checkbox.
  const [lastDone, setLastDone] = useState<{ id: string; title: string } | null>(
    null
  );
  useEffect(() => {
    if (!lastDone) return;
    const id = setTimeout(() => setLastDone(null), 5000);
    return () => clearTimeout(id);
  }, [lastDone]);

  const firstName = name ? name.split(" ")[0] : "there";

  const pendingTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.completed)
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        ),
    [tasks]
  );

  const nextTask = pendingTasks[0];
  const focusPct = Math.min(Math.round((todayMinutes / dailyGoal) * 100), 100);
  const minutesToGoal = Math.max(dailyGoal - todayMinutes, 0);

  // Sessions completed today, recent first — surfaces in the week card so the
  // user sees their effort logged, not as a separate "history" panel.
  const todaySessions = useMemo(() => {
    const todayKey = new Date().toDateString();
    return sessions
      .filter((s) => new Date(s.completedAt).toDateString() === todayKey)
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() -
          new Date(a.completedAt).getTime()
      );
  }, [sessions]);

  // Pending tasks grouped by day for the next 7 days. Overdue items collapse
  // into a single "Overdue" group at the top so they never get lost.
  const weekGroups = useMemo(() => {
    const ordered: { label: string; tasks: Task[] }[] = [];
    const byLabel = new Map<string, Task[]>();
    const cap = new Date();
    cap.setDate(cap.getDate() + 7);
    cap.setHours(23, 59, 59);

    for (const t of pendingTasks) {
      const due = new Date(t.dueDate);
      if (due > cap) continue;
      const label = dayLabel(t.dueDate);
      if (!byLabel.has(label)) {
        byLabel.set(label, []);
        ordered.push({ label, tasks: byLabel.get(label)! });
      }
      byLabel.get(label)!.push(t);
    }
    return ordered;
  }, [pendingTasks]);

  // Last 7 days of session activity → small dot trail on the streak chip.
  // Index 6 is today; earlier indexes are days ago.
  const last7 = useMemo(() => {
    const dates = new Set(
      sessions.map((s) => new Date(s.completedAt).toDateString())
    );
    const out: boolean[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push(dates.has(d.toDateString()));
    }
    return out;
  }, [sessions]);

  function handleWelcomeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!welcomeName.trim()) return;
    setName(welcomeName.trim());
    setShowWelcome(false);
  }

  return (
    <div className="desk-surface relative -mx-8 px-8 -mt-2 pt-2 pb-4">
      <Modal open={showWelcome} onClose={() => {}} width="sm">
        <div className="text-center py-2">
          <div className="flex justify-center mb-4">
            <AimLogo size="md" />
          </div>
          <h2 className="text-display text-baltic-800 dark:text-baltic-100 mb-1">
            Welcome to aim
          </h2>
          <p className="text-body text-steel-500 dark:text-steel-400 mb-5">
            A calm space to plan your studies and build focus habits.
          </p>
          <form onSubmit={handleWelcomeSubmit} className="space-y-3">
            <Input
              id="welcome-name"
              placeholder="What should we call you?"
              value={welcomeName}
              onChange={(e) => setWelcomeName(e.target.value)}
              autoFocus
              className="text-center"
            />
            <Button type="submit" className="w-full press">
              Get started
            </Button>
          </form>
        </div>
      </Modal>

      {/* Two restrained desk-surface blobs — atmosphere, no work to do */}
      <div
        aria-hidden
        className="absolute top-32 right-[-80px] w-72 h-72 blob-1 bg-baltic-200/25 dark:bg-baltic-700/15 float-slow pointer-events-none -z-10"
      />
      <div
        aria-hidden
        className="absolute bottom-20 right-[8%] w-32 h-32 blob-2 bg-ash-200/30 dark:bg-ash-800/15 float-slow pointer-events-none -z-10"
      />

      {/* ── HEADER — orient + ambient streak ── */}
      <header
        className="mb-8 sticky-enter"
        style={{ "--delay": "0ms" } as CSSProperties}
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-cream-100 dark:bg-cream-900/40 border border-cream-200 dark:border-cream-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-cream-500" />
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-cream-700 dark:text-cream-300">
              {getWeekday()}
            </span>
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-steel-400">
            {getFormattedDate()}
          </span>
          {streak > 0 && <StreakChip streak={streak} last7={last7} />}
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-baltic-800 dark:text-baltic-100 leading-[1.1] pt-1">
          {getGreeting()},{" "}
          <span className="font-script text-baltic-600 dark:text-baltic-300 text-[1.25em] inline-block translate-y-[2px]">
            {firstName}
          </span>
          <span className="text-baltic-600 dark:text-baltic-300">.</span>
        </h1>
      </header>

      {/* ── HERO — "Right now" — single dominant CTA, cream accent ── */}
      <StickyCard accent="cream" delay={80} className="mb-3">
        <HeroBody
          focusPct={focusPct}
          todayMinutes={todayMinutes}
          dailyGoal={dailyGoal}
          minutesToGoal={minutesToGoal}
          focusBlockMin={focusBlockMin}
          nextTask={nextTask}
          subject={nextTask ? getSubject(nextTask.subject) : undefined}
          hasAnySessions={sessions.length > 0}
          onFocus={() => router.push("/focus")}
          onPlanStep={() => router.push("/tasks")}
          onEditGoal={() => router.push("/settings")}
          onComplete={() => {
            if (!nextTask) return;
            setLastDone({ id: nextTask.id, title: nextTask.title });
            toggleComplete(nextTask.id);
          }}
        />
      </StickyCard>

      {/* Undo banner — slot reserved between hero and week so it never
          shifts other layout when it appears or disappears. */}
      <UndoSlot
        item={lastDone}
        onUndo={() => {
          if (!lastDone) return;
          toggleComplete(lastDone.id);
          setLastDone(null);
        }}
        onDismiss={() => setLastDone(null)}
      />

      {/* ── THIS WEEK — look-ahead + today's completed sessions, ash accent ── */}
      <StickyCard accent="ash" delay={160}>
        <WeekBody
          groups={weekGroups}
          todaySessions={todaySessions}
          getSubject={getSubject}
          onOpenAll={() => router.push("/tasks")}
        />
      </StickyCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   STREAK CHIP — 7-dot trail + count. Replaces the streak card.
   Today's dot has an outline so the user can read "did I focus
   today yet?" without counting.
   ───────────────────────────────────────────────────────────── */

function StreakChip({ streak, last7 }: { streak: number; last7: boolean[] }) {
  return (
    <span
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-baltic-50 dark:bg-baltic-900/40 border border-baltic-200/60 dark:border-baltic-800/60"
      title={`${streak}-day focus streak`}
    >
      <span className="flex items-center gap-[3px]">
        {last7.map((hit, i) => {
          const isToday = i === 6;
          return (
            <span
              key={i}
              className={cn(
                "block w-1 h-1 rounded-full",
                hit
                  ? "bg-baltic-600 dark:bg-baltic-300"
                  : "bg-baltic-200 dark:bg-baltic-800",
                isToday &&
                  "outline outline-1 outline-offset-[1px] outline-cream-500/70 dark:outline-cream-500/50"
              )}
            />
          );
        })}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-baltic-700 dark:text-baltic-300 tabular-nums">
        {streak}d streak
      </span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   HERO — focus widget on the left, named CTA on the right.
   One headline, one highlighter phrase, one button. Branches by
   user state so the empty path teaches instead of apologizing.
   ───────────────────────────────────────────────────────────── */

function HeroBody({
  focusPct,
  todayMinutes,
  dailyGoal,
  minutesToGoal,
  focusBlockMin,
  nextTask,
  subject,
  hasAnySessions,
  onFocus,
  onPlanStep,
  onEditGoal,
  onComplete,
}: {
  focusPct: number;
  todayMinutes: number;
  dailyGoal: number;
  minutesToGoal: number;
  focusBlockMin: number;
  nextTask: Task | undefined;
  subject: UserSubject | undefined;
  hasAnySessions: boolean;
  onFocus: () => void;
  onPlanStep: () => void;
  onEditGoal: () => void;
  onComplete: () => void;
}) {
  const isDone = focusPct >= 100;
  const subjectLabel = formatSubjectLabel(
    subject?.label ?? nextTask?.subject ?? "study"
  );
  const subjectColor = subject?.color ?? "#60729f";
  const blockLabel = formatTime(focusBlockMin); // e.g. "25m" or "1h"

  // ── Branch the headline + CTA by what the student actually needs ──
  let headline: ReactNode;
  let sub: ReactNode = null;
  let ctaLabel: string;
  let ctaAction: () => void;

  if (!nextTask && !hasAnySessions) {
    // Truly fresh — never touched the app
    headline = (
      <>
        Set your <span className="highlighter">first aim</span>.
      </>
    );
    sub = "Add a task and your study plan starts taking shape.";
    ctaLabel = "Add your first task";
    ctaAction = onPlanStep;
  } else if (!nextTask) {
    // Caught up but has a history
    headline = (
      <>
        <span className="highlighter">All caught up</span>.
      </>
    );
    sub = "Plan something to keep momentum.";
    ctaLabel = "Plan a study step";
    ctaAction = onPlanStep;
  } else if (isDone) {
    headline = (
      <>
        <span className="highlighter">Goal hit</span>. Anything more is bonus.
      </>
    );
    sub = `${formatTime(dailyGoal)} of focus locked in today.`;
    ctaLabel = `Start another ${blockLabel} on ${subjectLabel}`;
    ctaAction = onFocus;
  } else if (todayMinutes === 0) {
    const finish = projectedFinishTime(focusBlockMin);
    headline = (
      <>
        Aim for <span className="highlighter">{formatTime(dailyGoal)}</span>{" "}
        today.
      </>
    );
    sub = finish ? (
      <>
        First block ends at{" "}
        <span className="font-semibold tabular-nums text-baltic-700 dark:text-baltic-300">
          {finish}
        </span>
        .
      </>
    ) : null;
    ctaLabel = `Start ${blockLabel} on ${subjectLabel}`;
    ctaAction = onFocus;
  } else {
    const finish = projectedFinishTime(minutesToGoal);
    headline = (
      <>
        <span className="highlighter">{formatTime(minutesToGoal)} to go</span>.
      </>
    );
    sub = finish ? (
      <>
        Hit your goal by{" "}
        <span className="font-semibold tabular-nums text-baltic-700 dark:text-baltic-300">
          {finish}
        </span>
        .
      </>
    ) : null;
    ctaLabel = `Start ${blockLabel} on ${subjectLabel}`;
    ctaAction = onFocus;
  }

  return (
    <div
      className={cn(
        "grid gap-7 md:gap-10 items-start grid-cols-1",
        // Three-column layout reads left to right like a sentence:
        //   FOCUS (where I am)  ·  RIGHT NOW (the headline)  ·  WORKING ON (what to do)
        // The middle column flexes; the focus column is fixed; the action column
        // is generous enough to hold a task title without truncation.
        nextTask
          ? "lg:grid-cols-[13rem_minmax(0,1fr)_minmax(17rem,21rem)]"
          : "lg:grid-cols-[13rem_minmax(0,1fr)]"
      )}
    >
      {/* COLUMN 1 — FOCUS: progress visual.
          Order shifted on mobile so the headline lands first; the visual
          is reinforcement, not the entry point. Desktop reading stays L→R. */}
      <div className="order-2 lg:order-1">
        <FocusTarget
          focusPct={focusPct}
          todayMinutes={todayMinutes}
          dailyGoal={dailyGoal}
        />
      </div>

      {/* COLUMN 2 — RIGHT NOW: headline + sub. First on mobile. */}
      <div className="order-1 lg:order-2 text-center lg:text-left space-y-2">
        <CardEyebrow>Right now</CardEyebrow>
        <h2 className="text-2xl font-bold text-baltic-800 dark:text-baltic-100 leading-snug">
          {headline}
        </h2>
        {sub && (
          <p className="text-sm text-steel-500 dark:text-steel-400">{sub}</p>
        )}
        {/* Goal edit affordance — only shown when the goal is the salient
            number (mid-progress states). The user might wonder "where did
            2h come from?" — this answers it without cluttering the headline. */}
        {nextTask && !isDone && (
          <button
            onClick={onEditGoal}
            className="press text-[11px] font-medium text-steel-400 dark:text-steel-500 hover:text-baltic-700 dark:hover:text-baltic-300 rounded-md py-1 px-1.5 -mx-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950"
            style={{
              transition: "color 160ms ease, transform 160ms var(--ease-out)",
            }}
          >
            Adjust goal &rarr;
          </button>
        )}
        {!nextTask && (
          <div className="pt-3 flex items-center gap-3 flex-wrap justify-center lg:justify-start">
            <button
              onClick={ctaAction}
              className="press inline-flex items-center gap-2 min-w-0 max-w-full px-5 py-2.5 rounded-full bg-baltic-700 dark:bg-baltic-500 text-white text-sm font-semibold hover:bg-baltic-800 dark:hover:bg-baltic-400 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950"
              style={{
                transition:
                  "transform 160ms var(--ease-out), background-color 160ms ease",
              }}
            >
              <span className="truncate min-w-0">{ctaLabel}</span>
              <span className="text-base leading-none flex-shrink-0" aria-hidden>
                →
              </span>
            </button>
          </div>
        )}
      </div>

      {/* COLUMN 3 — UP NEXT: task + primary action.
          Lives in the same column as the CTA so "the task you're starting"
          and "the button that starts it" are visually linked. Renamed from
          "Working on" because the user hasn't started yet — they're about to.
          Explicit margins (not space-y) so the eyebrow→title gap matches
          col 2's, then meta hugs the title, then the action breathes. */}
      {nextTask && (
        <div className="order-3 text-center lg:text-left lg:border-l lg:border-lavender-200/60 lg:dark:border-lavender-800/60 lg:pl-7">
          <CardEyebrow>Up next</CardEyebrow>
          <p className="mt-3 text-sm font-bold text-baltic-800 dark:text-baltic-100 leading-snug line-clamp-2">
            {nextTask.title}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-steel-500 dark:text-steel-400 max-w-full">
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: subjectColor }}
            />
            <span className="truncate">{subjectLabel}</span>
            <span aria-hidden className="text-steel-300 dark:text-steel-600">
              ·
            </span>
            <span
              className={cn(
                "font-medium flex-shrink-0",
                isOverdue(nextTask.dueDate) &&
                  "text-red-500 dark:text-red-400"
              )}
            >
              {isOverdue(nextTask.dueDate)
                ? "Overdue"
                : dayLabel(nextTask.dueDate)}
            </span>
          </p>

          <div className="mt-5 flex items-center gap-3 justify-center lg:justify-start">
            <button
              onClick={ctaAction}
              className="press inline-flex items-center gap-2 min-w-0 max-w-full px-5 py-2.5 rounded-full bg-baltic-700 dark:bg-baltic-500 text-white text-sm font-semibold hover:bg-baltic-800 dark:hover:bg-baltic-400 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950"
              style={{
                transition:
                  "transform 160ms var(--ease-out), background-color 160ms ease",
              }}
            >
              <span className="truncate min-w-0">{ctaLabel}</span>
              <span className="text-base leading-none flex-shrink-0" aria-hidden>
                →
              </span>
            </button>
            <button
              onClick={onComplete}
              className="press flex-shrink-0 whitespace-nowrap rounded-md py-2 px-2 -my-2 -mx-2 text-xs font-semibold text-steel-500 dark:text-steel-400 hover:text-baltic-700 dark:hover:text-baltic-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950"
              style={{
                transition:
                  "color 160ms ease, transform 160ms var(--ease-out)",
              }}
            >
              Mark done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   THIS WEEK — day-grouped pending tasks. Today's row also lists
   completed sessions as quiet ash chips at the top, so a
   student's morning effort is visible alongside what's still due.
   ───────────────────────────────────────────────────────────── */

function WeekBody({
  groups,
  todaySessions,
  getSubject,
  onOpenAll,
}: {
  groups: { label: string; tasks: Task[] }[];
  todaySessions: FocusSession[];
  getSubject: (idOrLabel: string) => UserSubject | undefined;
  onOpenAll: () => void;
}) {
  const totalPending = groups.reduce((sum, g) => sum + g.tasks.length, 0);
  const isEmpty = totalPending === 0 && todaySessions.length === 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <CardEyebrow>This week</CardEyebrow>
        {totalPending > 0 && (
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-steel-400 tabular-nums">
            {totalPending} pending
          </span>
        )}
      </div>

      {isEmpty ? (
        <WeekEmpty onAdd={onOpenAll} />
      ) : (
        <div className="mt-5 space-y-5">
          {/* Today's completed sessions — only shown if today exists in groups
              we'd render the chips inside that group; otherwise prepend a
              today section so the user's done work is acknowledged. */}
          {todaySessions.length > 0 &&
            !groups.some((g) => g.label === "Today") && (
              <DayGroup
                label="Today"
                tasks={[]}
                completedSessions={todaySessions}
                getSubject={getSubject}
                onOpenTask={onOpenAll}
                rowDelayBase={220}
              />
            )}

          {groups.map((group, i) => (
            <DayGroup
              key={group.label}
              label={group.label}
              tasks={group.tasks}
              completedSessions={
                group.label === "Today" ? todaySessions : []
              }
              getSubject={getSubject}
              onOpenTask={onOpenAll}
              rowDelayBase={220 + i * 30}
            />
          ))}

          <button
            onClick={onOpenAll}
            className="press rounded-md py-1.5 px-2 -mx-2 text-xs font-semibold text-steel-500 dark:text-steel-400 hover:text-baltic-700 dark:hover:text-baltic-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950"
            style={{
              transition: "color 160ms ease, transform 160ms var(--ease-out)",
            }}
          >
            See all tasks &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

function DayGroup({
  label,
  tasks,
  completedSessions,
  getSubject,
  onOpenTask,
  rowDelayBase,
}: {
  label: string;
  tasks: Task[];
  completedSessions: FocusSession[];
  getSubject: (idOrLabel: string) => UserSubject | undefined;
  onOpenTask: () => void;
  rowDelayBase: number;
}) {
  const isOverdueGroup = label === "Overdue";
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <h3
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.2em]",
            isOverdueGroup
              ? "text-red-500 dark:text-red-400"
              : "text-steel-500 dark:text-steel-400"
          )}
        >
          {label}
        </h3>
        {tasks.length > 0 && (
          <span className="text-[10px] font-mono text-steel-300 dark:text-steel-600 tabular-nums">
            {tasks.length}
          </span>
        )}
      </div>

      <ul className="space-y-1">
        {completedSessions.map((s, i) => (
          <li
            key={s.id}
            className="sticky-enter"
            style={{ "--delay": `${rowDelayBase + i * 30}ms` } as CSSProperties}
          >
            <CompletedSessionRow
              session={s}
              subject={getSubject(s.subject)}
            />
          </li>
        ))}
        {tasks.map((t, i) => (
          <li
            key={t.id}
            className="sticky-enter"
            style={
              {
                "--delay": `${
                  rowDelayBase + (completedSessions.length + i) * 30
                }ms`,
              } as CSSProperties
            }
          >
            <TaskRow
              task={t}
              subject={getSubject(t.subject)}
              onOpen={onOpenTask}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompletedSessionRow({
  session,
  subject,
}: {
  session: FocusSession;
  subject: UserSubject | undefined;
}) {
  const date = new Date(session.completedAt);
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const label = subject?.label ?? session.subject;
  return (
    <div className="flex items-center gap-2.5 py-1.5 px-2.5 -mx-2 rounded-md text-xs text-ash-700 dark:text-ash-300 bg-ash-50/60 dark:bg-ash-900/25">
      <svg
        width="11"
        height="11"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ash-600 dark:text-ash-400 flex-shrink-0"
      >
        <path d="M2.5 6.5l2.5 2.5L9.5 4" />
      </svg>
      <span className="font-semibold">{label}</span>
      <span aria-hidden className="text-ash-400/70 dark:text-ash-600/70">
        ·
      </span>
      <span className="tabular-nums">{formatTime(session.duration)}</span>
      <span className="ml-auto tabular-nums text-[10px] font-mono uppercase tracking-[0.14em] text-ash-600/80 dark:text-ash-400/80">
        {time}
      </span>
    </div>
  );
}

function TaskRow({
  task,
  subject,
  onOpen,
}: {
  task: Task;
  subject: UserSubject | undefined;
  onOpen: () => void;
}) {
  const color = subject?.color ?? "#60729f";
  const label = subject?.label ?? task.subject;
  return (
    <button
      onClick={onOpen}
      className="press group w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-md text-left hover:bg-baltic-50/60 dark:hover:bg-baltic-900/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-baltic-950"
      style={{
        transition:
          "background-color 160ms ease, transform 160ms var(--ease-out)",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="flex-1 min-w-0 text-sm text-baltic-800 dark:text-baltic-100 truncate">
        {task.title}
      </span>
      <span className="text-[11px] text-steel-500 dark:text-steel-400 flex-shrink-0 hidden sm:inline">
        {label}
      </span>
      <span className="text-steel-300 dark:text-steel-600 flex-shrink-0 transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </button>
  );
}

function WeekEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-4">
      <p className="text-sm text-steel-500 dark:text-steel-400">
        Your week is empty. Add what&rsquo;s next so you have a place to start.
      </p>
      <button
        onClick={onAdd}
        className="press mt-3 rounded-md py-1.5 px-2 -mx-2 text-xs font-semibold text-baltic-700 dark:text-baltic-300 hover:text-baltic-900 dark:hover:text-baltic-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950"
        style={{
          transition: "color 160ms ease, transform 160ms var(--ease-out)",
        }}
      >
        Plan a study step →
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   UNDO SLOT — reserves a row between the hero and the week so
   the layout stays still whether or not an undo is pending.
   Mark done is destructive enough to deserve a 5-second window;
   without this, accidental taps mean a navigation to /tasks to
   re-open and toggle the checkbox.
   ───────────────────────────────────────────────────────────── */

function UndoSlot({
  item,
  onUndo,
  onDismiss,
}: {
  item: { id: string; title: string } | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="min-h-[2.75rem] mb-3 flex items-center" aria-live="polite">
      {item && (
        <div
          role="status"
          className="sticky-enter w-full inline-flex items-center justify-between gap-3 px-4 py-2 rounded-full bg-baltic-700 dark:bg-baltic-800 text-white text-xs shadow-sm"
          style={{ "--delay": "0ms" } as CSSProperties}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="flex-shrink-0 text-cream-400"
            >
              <path d="M2.5 6.5l2.5 2.5L9.5 4" />
            </svg>
            <span className="font-semibold flex-shrink-0">Marked done.</span>
            <span className="truncate text-white/70">{item.title}</span>
          </span>
          <span className="inline-flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onUndo}
              className="press rounded-md py-1 px-2 -my-1 text-xs font-bold text-cream-300 hover:text-cream-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-baltic-700"
              style={{
                transition:
                  "color 160ms ease, transform 160ms var(--ease-out)",
              }}
            >
              Undo
            </button>
            <button
              onClick={onDismiss}
              aria-label="Dismiss"
              className="press rounded-md p-1 -m-1 text-white/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-baltic-700"
              style={{
                transition:
                  "color 160ms ease, transform 160ms var(--ease-out)",
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M2 2 L10 10 M10 2 L2 10" />
              </svg>
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   STICKY CARD — flat panel with a thin top accent bar. The accent
   is the only color signal that distinguishes one surface from
   another; everything else stays uniform so the page reads as a
   single composition. Cards level — no tilt, no thumbtack, no
   tape. Visual rhythm comes from the accent palette + content,
   not from physical-world decoration.
   ───────────────────────────────────────────────────────────── */

type Accent = "cream" | "ash" | "baltic";

const ACCENT_FILLS: Record<Accent, { light: string; dark: string }> = {
  // cream-400 / cream-600 — warm, "active right now" energy
  cream: { light: "#c7ce64", dark: "#949b31" },
  // ash-400 / ash-600 — calm, "looking ahead" planning
  ash: { light: "#91a989", dark: "#5e7656" },
  // baltic-400 / baltic-600 — primary anchor, used sparingly
  baltic: { light: "#808eb3", dark: "#4d5b80" },
};

function StickyCard({
  children,
  accent = "cream",
  delay = 0,
  className,
}: {
  children: ReactNode;
  accent?: Accent;
  delay?: number;
  className?: string;
}) {
  const fill = ACCENT_FILLS[accent];
  return (
    <div
      className={cn(
        "paper-card sticky-enter relative px-6 pt-7 pb-6 border border-lavender-200/60 dark:border-lavender-800/60 overflow-hidden",
        className
      )}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
    >
      {/* Top accent — the only color that distinguishes one card
          from another. Light/dark mode handled inline. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 dark:hidden"
        style={{ backgroundColor: fill.light }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 hidden dark:block"
        style={{ backgroundColor: fill.dark }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function CardEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-steel-500 dark:text-steel-400">
      {children}
    </p>
  );
}

/* ─────────────────────────────────────────────────────────────
   FOCUS TARGET — the full "a" of aim. Bowl + tail silhouette
   pulled directly from the AimLogo paths; baltic translates up
   from below as focus minutes accrue. White counter dot sits in
   the bowl with the percentage centered.
   ───────────────────────────────────────────────────────────── */

const A_BOWL_CX = 241.5;
const A_BOWL_CY = 293.5;
const A_BOWL_R = 64.5;
const A_TAIL_PATH =
  "M305.782 288.417L306 290V356H233V279H302.256L305.782 288.417Z";
const A_COUNTER_CX = 242;
const A_COUNTER_CY = 294.5;
const A_COUNTER_R = 20;

const A_VB_X = 170;
const A_VB_Y = 222;
const A_VB_SIZE = 142;
const A_TOP = A_BOWL_CY - A_BOWL_R;
const A_HEIGHT = 2 * A_BOWL_R;

function FocusTarget({
  focusPct,
  todayMinutes,
  dailyGoal,
}: {
  focusPct: number;
  todayMinutes: number;
  dailyGoal: number;
}) {
  return (
    <div className="mx-auto w-full max-w-[15rem] text-center">
      <CardEyebrow>Focus</CardEyebrow>

      <div className="relative mx-auto mt-3 w-44 h-44">
        <svg
          aria-hidden
          viewBox={`${A_VB_X} ${A_VB_Y} ${A_VB_SIZE} ${A_VB_SIZE}`}
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <clipPath id="aim-a-silhouette">
              <circle cx={A_BOWL_CX} cy={A_BOWL_CY} r={A_BOWL_R} />
              <path d={A_TAIL_PATH} />
            </clipPath>
          </defs>

          <g clipPath="url(#aim-a-silhouette)">
            <rect
              x={A_VB_X}
              y={A_VB_Y}
              width={A_VB_SIZE}
              height={A_VB_SIZE}
              className="fill-lavender-200/55 dark:fill-lavender-800/40"
            />
            <rect
              x={A_VB_X}
              y={A_TOP}
              width={A_VB_SIZE}
              height={A_HEIGHT}
              className="fill-baltic-700 dark:fill-baltic-400"
              style={{
                transform: `translateY(${
                  100 - Math.max(0, Math.min(100, focusPct))
                }%)`,
                transformBox: "fill-box",
                transition: "transform 800ms var(--ease-out)",
              }}
            />
          </g>

          <circle
            cx={A_COUNTER_CX}
            cy={A_COUNTER_CY}
            r={A_COUNTER_R}
            className="fill-white dark:fill-baltic-900"
          />
        </svg>
      </div>

      <p className="mt-4 text-xs text-steel-500 dark:text-steel-400">
        <span className="font-semibold tabular-nums text-baltic-700 dark:text-baltic-300">
          {formatTime(todayMinutes)}
        </span>{" "}
        of{" "}
        <span className="font-semibold tabular-nums text-baltic-700 dark:text-baltic-300">
          {formatTime(dailyGoal)}
        </span>
      </p>
    </div>
  );
}
