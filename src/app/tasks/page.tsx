"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useTasks, useSubjects } from "@/lib/contexts";
import {
  PRIORITIES,
  SUBJECT_COLORS,
  type Task,
  type UserSubject,
} from "@/lib/types";
import {
  cn,
  formatDate,
  isOverdue,
  dayLabel,
  getWeekday,
  getFormattedDate,
} from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

type StatusFilter = "pending" | "completed" | "all";

export default function TasksPage() {
  const { tasks, addTask, toggleComplete, deleteTask } = useTasks();
  const { subjects, getSubject, addSubject, deleteSubject } = useSubjects();

  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("pending");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalSubject, setAddModalSubject] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);

  // Inline undo for Mark done — capture the task at the moment of completion
  // so an accidental checkbox tap is recoverable. Mirrors the dashboard's
  // pattern so the experience is consistent across the app.
  const [lastDone, setLastDone] = useState<{ id: string; title: string } | null>(null);
  useEffect(() => {
    if (!lastDone) return;
    const id = setTimeout(() => setLastDone(null), 5000);
    return () => clearTimeout(id);
  }, [lastDone]);

  // Inline undo for closing a subject tab. Browser-tab close is one-click;
  // the tasks tied to the subject keep their data but lose their color
  // label until undo restores the subject (or the user re-creates it).
  const [lastClosedSubject, setLastClosedSubject] = useState<UserSubject | null>(null);
  useEffect(() => {
    if (!lastClosedSubject) return;
    const id = setTimeout(() => setLastClosedSubject(null), 5000);
    return () => clearTimeout(id);
  }, [lastClosedSubject]);

  const handleCloseSubject = useCallback(
    (subject: UserSubject) => {
      deleteSubject(subject.id);
      setLastClosedSubject(subject);
      // Drop back to "All" if the user just closed the active tab.
      setActiveSubject((prev) => (prev === subject.label ? "all" : prev));
    },
    [deleteSubject]
  );

  const handleUndoCloseSubject = useCallback(() => {
    if (!lastClosedSubject) return;
    addSubject(lastClosedSubject.label, lastClosedSubject.color);
    setLastClosedSubject(null);
  }, [lastClosedSubject, addSubject]);

  const handleCreateSubject = useCallback(
    (label: string, color: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      if (
        subjects.some((s) => s.label.toLowerCase() === trimmed.toLowerCase())
      ) {
        return;
      }
      addSubject(trimmed, color);
      setActiveSubject(trimmed);
      setShowAddSubject(false);
    },
    [subjects, addSubject]
  );

  // Counts per subject + globally. One pass so we don't reduce twice.
  const stats = useMemo(() => {
    type Pile = { pending: number; completed: number; overdue: number; total: number };
    const all: Pile = { pending: 0, completed: 0, overdue: 0, total: 0 };
    const bySubject: Record<string, Pile> = {};
    for (const sub of subjects) {
      bySubject[sub.label] = { pending: 0, completed: 0, overdue: 0, total: 0 };
    }
    for (const t of tasks) {
      const piles: Pile[] = [all];
      const subPile = bySubject[t.subject];
      if (subPile) piles.push(subPile);
      for (const p of piles) {
        p.total++;
        if (t.completed) p.completed++;
        else {
          p.pending++;
          if (isOverdue(t.dueDate)) p.overdue++;
        }
      }
    }
    return { all, bySubject };
  }, [tasks, subjects]);

  const currentStats =
    activeSubject === "all"
      ? stats.all
      : stats.bySubject[activeSubject] || {
          pending: 0,
          completed: 0,
          overdue: 0,
          total: 0,
        };

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (activeSubject !== "all") {
      result = result.filter((t) => t.subject === activeSubject);
    }
    if (filterStatus === "pending") {
      result = result.filter((t) => !t.completed);
    } else if (filterStatus === "completed") {
      result = result.filter((t) => t.completed);
    }
    return [...result].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const aOverdue = !a.completed && isOverdue(a.dueDate);
      const bOverdue = !b.completed && isOverdue(b.dueDate);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, activeSubject, filterStatus]);

  // Group tasks by day-bucket. Overdue floats to top; completed sinks to
  // bottom. Within a bucket we keep the existing sort (priority/due).
  const dayGroups = useMemo(() => {
    const ordered: { label: string; tasks: Task[] }[] = [];
    const byLabel = new Map<string, Task[]>();
    for (const t of filteredTasks) {
      const label = t.completed
        ? "Completed"
        : isOverdue(t.dueDate)
        ? "Overdue"
        : dayLabel(t.dueDate);
      let bucket = byLabel.get(label);
      if (!bucket) {
        bucket = [];
        byLabel.set(label, bucket);
        ordered.push({ label, tasks: bucket });
      }
      bucket.push(t);
    }
    return ordered.sort((a, b) => {
      if (a.label === "Overdue") return -1;
      if (b.label === "Overdue") return 1;
      if (a.label === "Completed") return 1;
      if (b.label === "Completed") return -1;
      return 0;
    });
  }, [filteredTasks]);

  const handleNewTask = useCallback(() => {
    setAddModalSubject(activeSubject !== "all" ? activeSubject : null);
    setShowAddModal(true);
  }, [activeSubject]);

  return (
    <div className="desk-surface relative -mx-8 px-8 -mt-2 pt-2 pb-6">
      {/* Two restrained desk-surface blobs — atmosphere, no work to do */}
      <div
        aria-hidden
        className="absolute top-32 right-[-80px] w-72 h-72 blob-1 bg-baltic-200/25 dark:bg-baltic-700/15 float-slow pointer-events-none -z-10"
      />
      <div
        aria-hidden
        className="absolute bottom-24 left-[-50px] w-32 h-32 blob-2 bg-ash-200/30 dark:bg-ash-800/15 float-medium pointer-events-none -z-10"
      />

      {/* ── HEADER — orient + page-level status chip ── */}
      <header
        className="mb-6 sticky-enter"
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
          {(stats.all.pending > 0 || stats.all.overdue > 0) && (
            <StatusChip pending={stats.all.pending} overdue={stats.all.overdue} />
          )}
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-baltic-800 dark:text-baltic-100 leading-[1.1]">
          <span className="highlighter">Tasks</span>
          <span className="text-baltic-600 dark:text-baltic-300">.</span>
        </h1>
        <p className="mt-3 text-sm text-steel-500 dark:text-steel-400 max-w-md">
          {headlineSub(stats.all)}
        </p>
      </header>

      {/* ── SUBJECT TABS — browser-style binder tabs that connect to the
            card. Each tab closes with one click; the + opens "New subject". ── */}
      <SubjectTabs
        subjects={subjects}
        active={activeSubject}
        counts={stats.bySubject}
        totalPending={stats.all.pending}
        onChange={setActiveSubject}
        onClose={handleCloseSubject}
        onAdd={() => setShowAddSubject(true)}
      />

      {/* ── LIST — paper surface, top corners squared so the tabs above
            merge in with no visible seam. Subject color shows as the
            active tab's top stripe (browser theme-line), not as a band
            across the card. ── */}
      <StickyCard topFlat delay={140}>
        {/* Eyebrow row — context label, counts, status pills, new button */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <CardEyebrow>
            {activeSubject === "all" ? "All tasks" : activeSubject}
          </CardEyebrow>
          <span aria-hidden className="text-steel-300 dark:text-steel-600 text-[10px]">
            ·
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-steel-400 tabular-nums">
            {currentStats.pending} pending · {currentStats.completed} done
            {currentStats.overdue > 0 && (
              <>
                {" "}·{" "}
                <span className="text-red-500 dark:text-red-400">
                  {currentStats.overdue} overdue
                </span>
              </>
            )}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <StatusFilterPills value={filterStatus} onChange={setFilterStatus} />
            <button
              onClick={handleNewTask}
              className="press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-baltic-700 dark:bg-baltic-500 text-white text-[11px] font-semibold hover:bg-baltic-800 dark:hover:bg-baltic-400 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950"
              style={{
                transition:
                  "transform 160ms var(--ease-out), background-color 160ms ease",
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M7 3v8M3 7h8" />
              </svg>
              New task
            </button>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <Empty
            filterStatus={filterStatus}
            activeSubject={activeSubject}
            hasAnyTasks={tasks.length > 0}
            onAdd={handleNewTask}
            onShowPending={() => setFilterStatus("pending")}
          />
        ) : (
          <div className="space-y-6">
            {dayGroups.map((g, gi) => (
              <DayGroup
                key={g.label}
                label={g.label}
                tasks={g.tasks}
                showSubject={activeSubject === "all"}
                getSubject={getSubject}
                onSelect={setSelectedTask}
                onComplete={(id, title) => {
                  setLastDone({ id, title });
                  toggleComplete(id);
                }}
                onUncomplete={(id) => toggleComplete(id)}
                rowDelayBase={200 + gi * 30}
              />
            ))}
          </div>
        )}
      </StickyCard>

      {/* Undo banner — slot reserved so the layout stays still */}
      <UndoSlot
        item={lastDone}
        onUndo={() => {
          if (!lastDone) return;
          toggleComplete(lastDone.id);
          setLastDone(null);
        }}
        onDismiss={() => setLastDone(null)}
      />

      {/* Subject-close undo — separate slot so it stacks naturally with
          the task-completion undo if both fire in quick succession. */}
      <SubjectUndoSlot
        subject={lastClosedSubject}
        onUndo={handleUndoCloseSubject}
        onDismiss={() => setLastClosedSubject(null)}
      />

      {/* Modals */}
      <AddSubjectModal
        open={showAddSubject}
        onClose={() => setShowAddSubject(false)}
        onAdd={handleCreateSubject}
        existingLabels={subjects.map((s) => s.label)}
      />

      <AddTaskModal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setAddModalSubject(null);
        }}
        onAdd={addTask}
        initialSubject={addModalSubject}
      />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          subject={getSubject(selectedTask.subject)}
          onClose={() => setSelectedTask(null)}
          onToggle={() => {
            toggleComplete(selectedTask.id);
            setSelectedTask(null);
          }}
          onDelete={() => {
            deleteTask(selectedTask.id);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HEADLINE COPY — branches by state so the sub line teaches and
   prioritizes instead of just repeating the count.
   ───────────────────────────────────────────────────────────── */

function headlineSub(stats: {
  pending: number;
  completed: number;
  overdue: number;
  total: number;
}): ReactNode {
  if (stats.total === 0) {
    return "Add your first task and your study plan starts taking shape.";
  }
  if (stats.pending === 0) {
    return "Caught up — every task closed. Plan what's next.";
  }
  if (stats.overdue > 0) {
    const remaining = stats.pending - stats.overdue;
    return (
      <>
        <span className="text-red-500 dark:text-red-400 font-semibold">
          {stats.overdue} overdue
        </span>
        {remaining > 0 && (
          <>
            {" "}· {remaining} more on the way
          </>
        )}
        . Tackle the urgent first.
      </>
    );
  }
  if (stats.pending === 1) {
    return "Just one thing on the list. Knock it out.";
  }
  return `${stats.pending} pending. One step at a time.`;
}

/* ─────────────────────────────────────────────────────────────
   STATUS CHIP — a single page-level pill that speaks the most
   urgent fact: overdue if any, otherwise pending count. Mirrors
   the dashboard's StreakChip in form — colored dot + mono label.
   ───────────────────────────────────────────────────────────── */

function StatusChip({ pending, overdue }: { pending: number; overdue: number }) {
  if (overdue > 0) {
    return (
      <span
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/60"
        title={`${overdue} overdue`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-red-600 dark:text-red-400 tabular-nums">
          {overdue} overdue
        </span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-baltic-50 dark:bg-baltic-900/40 border border-baltic-200/60 dark:border-baltic-800/60"
      title={`${pending} pending`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-baltic-500" />
      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-baltic-700 dark:text-baltic-300 tabular-nums">
        {pending} pending
      </span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   SUBJECT TABS — browser-style binder tabs that physically merge
   into the StickyCard below. The wrapper sits one pixel into the
   card (-mb-px, z-10) so the active tab paints over the card's
   top border and the seam disappears. Subject color shows as a
   2px stripe along the active tab's TOP edge — the same place a
   browser puts its theme color line.

   Each subject tab carries a one-click × close affordance; the
   final slot is a + button that opens the New subject modal.
   ───────────────────────────────────────────────────────────── */

interface TabItem {
  id: string;
  label: string;
  color: string;
  count: number;
  raw?: UserSubject;
}

function SubjectTabs({
  subjects,
  active,
  counts,
  totalPending,
  onChange,
  onClose,
  onAdd,
}: {
  subjects: UserSubject[];
  active: string;
  counts: Record<string, { pending: number }>;
  totalPending: number;
  onChange: (id: string) => void;
  onClose: (subject: UserSubject) => void;
  onAdd: () => void;
}) {
  const items: TabItem[] = useMemo(
    () => [
      { id: "all", label: "All", color: "#9faac6", count: totalPending },
      ...subjects.map((s) => ({
        id: s.label,
        label: s.label,
        color: s.color,
        count: counts[s.label]?.pending ?? 0,
        raw: s,
      })),
    ],
    [subjects, totalPending, counts]
  );

  return (
    <div
      // z-10 + -mb-px: the row sits one pixel into the card so the active
      // tab can paint over the card's top border, dissolving the seam.
      className="sticky-enter relative z-10 -mb-px"
      style={{ "--delay": "70ms" } as CSSProperties}
    >
      {/* Quiet rule along the bottom of the row that inactive tabs sit on.
          The active tab is opaque and paints over this rule cleanly. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-lavender-200/60 dark:bg-lavender-800/60"
      />

      <div className="flex items-end gap-0.5 overflow-x-auto pt-1 px-1 -mx-1">
        {items.map((item) => (
          <SubjectTab
            key={item.id}
            item={item}
            isActive={item.id === active}
            onSelect={() => onChange(item.id)}
            onClose={item.raw ? () => onClose(item.raw!) : undefined}
          />
        ))}

        <AddSubjectButton onClick={onAdd} />
      </div>
    </div>
  );
}

function SubjectTab({
  item,
  isActive,
  onSelect,
  onClose,
}: {
  item: TabItem;
  isActive: boolean;
  onSelect: () => void;
  onClose?: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "press group relative inline-flex items-center gap-2 whitespace-nowrap cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950",
        isActive
          ? "z-10 pl-4 pr-3 py-2.5 rounded-t-xl bg-white dark:bg-lavender-900 border border-b-0 border-lavender-200/60 dark:border-lavender-800/60 shadow-[0_-1px_3px_rgba(38,45,64,0.05)] dark:shadow-[0_-1px_3px_rgba(0,0,0,0.30)] text-baltic-800 dark:text-baltic-100 overflow-hidden"
          : "px-3 py-2 rounded-t-lg text-steel-500 dark:text-steel-400 hover:text-baltic-700 dark:hover:text-baltic-300 hover:bg-white/55 dark:hover:bg-lavender-900/40"
      )}
      style={{
        transition:
          "background-color 200ms ease, color 200ms ease, transform 160ms var(--ease-out), border-color 200ms ease",
      }}
    >
      {/* Subject color stripe along the active tab's TOP edge — a
          browser-style theme-line that signs the lid with the
          subject's color without tinting the surface. */}
      {isActive && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ backgroundColor: item.color }}
        />
      )}

      <span
        aria-hidden
        className={cn(
          "rounded-full flex-shrink-0",
          isActive ? "w-2 h-2" : "w-1.5 h-1.5"
        )}
        style={{
          backgroundColor: item.color,
          opacity: isActive ? 1 : 0.55,
          transition: "opacity 200ms ease, width 200ms ease, height 200ms ease",
        }}
      />
      <span
        className={cn(
          "text-xs",
          isActive ? "font-semibold" : "font-medium"
        )}
      >
        {item.label}
      </span>
      {item.count > 0 && (
        <span
          className={cn(
            "tabular-nums text-[10px] font-mono",
            isActive
              ? "text-baltic-500 dark:text-baltic-400"
              : "text-steel-300 dark:text-steel-600"
          )}
        >
          {item.count}
        </span>
      )}

      {/* Close affordance — visible on the active tab and on hover.
          One-click; recovery is the undo banner below the list. */}
      {onClose && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`Close ${item.label}`}
          className={cn(
            "press ml-0.5 -mr-1 flex items-center justify-center w-[18px] h-[18px] rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70",
            isActive
              ? "text-steel-400 dark:text-steel-500 hover:bg-baltic-100 dark:hover:bg-baltic-800/60 hover:text-baltic-700 dark:hover:text-baltic-200 opacity-100"
              : "text-steel-300 dark:text-steel-600 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-baltic-100 dark:hover:bg-baltic-800/60 hover:text-baltic-700 dark:hover:text-baltic-200"
          )}
          style={{
            transition:
              "opacity 160ms ease, background-color 160ms ease, color 160ms ease, transform 160ms var(--ease-out)",
          }}
        >
          <svg
            width="9"
            height="9"
            viewBox="0 0 9 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M2 2 L7 7 M7 2 L2 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

function AddSubjectButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="New subject"
      title="New subject"
      className="press relative ml-1 inline-flex items-center justify-center w-7 h-7 mb-0.5 rounded-md text-steel-400 dark:text-steel-500 hover:text-baltic-700 dark:hover:text-baltic-200 hover:bg-white/55 dark:hover:bg-lavender-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950"
      style={{
        transition:
          "background-color 160ms ease, color 160ms ease, transform 160ms var(--ease-out)",
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M6 2v8M2 6h8" />
      </svg>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   STATUS FILTER PILLS — Pending / All / Done segmented control.
   Mono uppercase to read as a control, not as content.
   ───────────────────────────────────────────────────────────── */

function StatusFilterPills({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
}) {
  const opts = [
    { value: "pending", label: "Pending" },
    { value: "all", label: "All" },
    { value: "completed", label: "Done" },
  ] as const;
  return (
    <div className="inline-flex items-center gap-0.5 bg-baltic-50 dark:bg-baltic-900/40 rounded-full p-0.5">
      {opts.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "press px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.16em] focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70",
            value === opt.value
              ? "bg-white dark:bg-lavender-900 shadow-sm text-baltic-800 dark:text-baltic-100"
              : "text-steel-400 hover:text-baltic-700 dark:hover:text-baltic-300"
          )}
          style={{
            transition:
              "background-color 160ms ease, color 160ms ease, transform 160ms var(--ease-out)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DAY GROUP — Today / Tomorrow / weekday name / Overdue / Completed.
   Mirrors the dashboard's WeekBody so the two pages teach the
   same scanning pattern.
   ───────────────────────────────────────────────────────────── */

function DayGroup({
  label,
  tasks,
  showSubject,
  getSubject,
  onSelect,
  onComplete,
  onUncomplete,
  rowDelayBase,
}: {
  label: string;
  tasks: Task[];
  showSubject: boolean;
  getSubject: (idOrLabel: string) => UserSubject | undefined;
  onSelect: (t: Task) => void;
  onComplete: (id: string, title: string) => void;
  onUncomplete: (id: string) => void;
  rowDelayBase: number;
}) {
  const isUrgent = label === "Overdue";
  const isDone = label === "Completed";
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <h3
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.22em]",
            isUrgent
              ? "text-red-500 dark:text-red-400"
              : isDone
              ? "text-ash-600 dark:text-ash-400"
              : "text-steel-500 dark:text-steel-400"
          )}
        >
          {label}
        </h3>
        <span className="text-[10px] font-mono text-steel-300 dark:text-steel-600 tabular-nums">
          {tasks.length}
        </span>
      </div>
      <ul className="space-y-0.5 -mx-2">
        {tasks.map((t, i) => (
          <li
            key={t.id}
            className="sticky-enter"
            style={
              { "--delay": `${rowDelayBase + i * 25}ms` } as CSSProperties
            }
          >
            <TaskRow
              task={t}
              subject={getSubject(t.subject)}
              showSubject={showSubject}
              showDate={!isUrgent && label !== "Today"}
              onSelect={() => onSelect(t)}
              onToggle={() => {
                if (t.completed) onUncomplete(t.id);
                else onComplete(t.id, t.title);
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TASK ROW — checkbox + title + meta line + hover arrow. Click
   the row to open detail; click the checkbox to toggle. High
   priority gets a quiet flag glyph next to the title; medium /
   low stay clean so the row has rhythm and breath.
   ───────────────────────────────────────────────────────────── */

function TaskRow({
  task,
  subject,
  showSubject,
  showDate,
  onSelect,
  onToggle,
}: {
  task: Task;
  subject: UserSubject | undefined;
  showSubject: boolean;
  showDate: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const overdue = !task.completed && isOverdue(task.dueDate);
  const color = subject?.color || "#9faac6";
  const isHigh = task.priority === "high";
  const subjectLabel = subject?.label || task.subject;

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect();
      }}
      className={cn(
        "press group flex items-center gap-3 py-2 px-2 rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-baltic-950 hover:bg-baltic-50/70 dark:hover:bg-baltic-900/30",
        task.completed && "opacity-50 hover:opacity-70"
      )}
      style={{
        transition:
          "background-color 160ms ease, transform 160ms var(--ease-out), opacity 160ms ease",
      }}
    >
      {/* Check circle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={task.completed ? "Mark pending" : "Mark complete"}
        className={cn(
          "w-[18px] h-[18px] rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center hover:scale-110",
          task.completed && "bg-ash-500 border-ash-500"
        )}
        style={
          !task.completed
            ? {
                borderColor: color,
                transition:
                  "transform 120ms var(--ease-out), border-color 120ms ease, background-color 120ms ease",
              }
            : { transition: "transform 120ms var(--ease-out)" }
        }
      >
        {task.completed ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 6.5l2.5 2.5L9.5 4" />
          </svg>
        ) : (
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-0 group-hover:opacity-50"
            style={{ transition: "opacity 160ms ease" }}
          >
            <path d="M2.5 6.5l2.5 2.5L9.5 4" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {isHigh && !task.completed && (
            <span
              aria-label="High priority"
              title="High priority"
              className="flex-shrink-0 inline-flex items-center text-cream-700 dark:text-cream-400"
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 9 9"
                fill="currentColor"
                aria-hidden
              >
                <path d="M2 1.5v6l3-2 2 2v-6z" />
              </svg>
            </span>
          )}
          <p
            className={cn(
              "text-sm font-semibold truncate",
              task.completed
                ? "text-steel-400 dark:text-steel-500 line-through"
                : "text-baltic-800 dark:text-baltic-100"
            )}
          >
            {task.title}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-steel-500 dark:text-steel-400 min-w-0">
          {showSubject && (
            <>
              <span
                aria-hidden
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="truncate">{subjectLabel}</span>
            </>
          )}
          {(showSubject && (showDate || overdue)) && (
            <span aria-hidden className="text-steel-300 dark:text-steel-600">
              ·
            </span>
          )}
          {overdue ? (
            <span className="text-red-500 dark:text-red-400 font-semibold flex-shrink-0">
              {formatDate(task.dueDate)}
            </span>
          ) : showDate ? (
            <span className="flex-shrink-0">{formatDate(task.dueDate)}</span>
          ) : null}
        </div>
      </div>

      {/* Hover arrow — same affordance as dashboard's TaskRow */}
      <span
        aria-hidden
        className="text-steel-300 dark:text-steel-600 group-hover:translate-x-0.5 group-hover:text-steel-400 dark:group-hover:text-steel-500 flex-shrink-0"
        style={{ transition: "transform 160ms var(--ease-out), color 160ms ease" }}
      >
        →
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   EMPTY — branches the message and the recovery CTA by why the
   list is empty. Caught-up ≠ filtered-out ≠ first-time, and the
   user shouldn't have to think about which.
   ───────────────────────────────────────────────────────────── */

function Empty({
  filterStatus,
  activeSubject,
  hasAnyTasks,
  onAdd,
  onShowPending,
}: {
  filterStatus: StatusFilter;
  activeSubject: string;
  hasAnyTasks: boolean;
  onAdd: () => void;
  onShowPending: () => void;
}) {
  let title: string;
  let sub: string;
  if (!hasAnyTasks) {
    title = "Nothing on the list yet.";
    sub = "Add your first task to start a study plan.";
  } else if (filterStatus === "completed") {
    title = "Nothing finished yet.";
    sub = "Once you mark something done, it lands here.";
  } else if (filterStatus === "all" && activeSubject !== "all") {
    title = `No ${activeSubject} tasks.`;
    sub = "Add one to keep the subject moving.";
  } else if (activeSubject !== "all") {
    title = `No pending ${activeSubject} tasks.`;
    sub = "All caught up here. Switch subjects or plan ahead.";
  } else {
    title = "Caught up.";
    sub = "Every pending task is closed. Plan what's next.";
  }

  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-12 h-12 rounded-full bg-cream-50 dark:bg-cream-900/30 border border-cream-200/60 dark:border-cream-800/60 flex items-center justify-center mb-4">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cream-700 dark:text-cream-400"
          aria-hidden
        >
          <path d="M3 10l3 3L17 5" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-baltic-800 dark:text-baltic-100">
        {title}
      </p>
      <p className="text-xs text-steel-500 dark:text-steel-400 mt-1 max-w-xs">
        {sub}
      </p>
      <div className="flex items-center gap-3 mt-5">
        {filterStatus !== "pending" && hasAnyTasks && (
          <button
            onClick={onShowPending}
            className="press text-xs font-semibold text-steel-500 dark:text-steel-400 hover:text-baltic-700 dark:hover:text-baltic-300 rounded-md py-1.5 px-2 -my-1.5 -mx-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950"
            style={{
              transition: "color 160ms ease, transform 160ms var(--ease-out)",
            }}
          >
            Show pending →
          </button>
        )}
        <button
          onClick={onAdd}
          className="press inline-flex items-center gap-2 px-4 py-2 rounded-full bg-baltic-700 dark:bg-baltic-500 text-white text-xs font-semibold hover:bg-baltic-800 dark:hover:bg-baltic-400 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950"
          style={{
            transition:
              "transform 160ms var(--ease-out), background-color 160ms ease",
          }}
        >
          {hasAnyTasks ? "Add a task" : "Add your first task"}
          <span aria-hidden className="text-base leading-none">
            →
          </span>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   UNDO SLOT — same behavior as the dashboard. A reserved row
   between the list and the page bottom keeps the layout still
   whether or not an undo is pending.
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
    <div className="min-h-[2.75rem] mt-3 flex items-center" aria-live="polite">
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
                transition: "color 160ms ease, transform 160ms var(--ease-out)",
              }}
            >
              Undo
            </button>
            <button
              onClick={onDismiss}
              aria-label="Dismiss"
              className="press rounded-md p-1 -m-1 text-white/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-baltic-700"
              style={{
                transition: "color 160ms ease, transform 160ms var(--ease-out)",
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
   SUBJECT UNDO SLOT — companion to UndoSlot. Closing a tab is
   one-click; this banner gives the user 5 seconds to take it
   back, reusing the dashboard's banner shape so both kinds of
   undo feel like one mechanism.
   ───────────────────────────────────────────────────────────── */

function SubjectUndoSlot({
  subject,
  onUndo,
  onDismiss,
}: {
  subject: UserSubject | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="min-h-[2.75rem] mt-2 flex items-center" aria-live="polite">
      {subject && (
        <div
          role="status"
          className="sticky-enter w-full inline-flex items-center justify-between gap-3 px-4 py-2 rounded-full bg-baltic-700 dark:bg-baltic-800 text-white text-xs shadow-sm"
          style={{ "--delay": "0ms" } as CSSProperties}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <span
              aria-hidden
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: subject.color }}
            />
            <span className="font-semibold flex-shrink-0">Closed.</span>
            <span className="truncate text-white/70">{subject.label}</span>
          </span>
          <span className="inline-flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onUndo}
              className="press rounded-md py-1 px-2 -my-1 text-xs font-bold text-cream-300 hover:text-cream-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-baltic-700"
              style={{
                transition: "color 160ms ease, transform 160ms var(--ease-out)",
              }}
            >
              Undo
            </button>
            <button
              onClick={onDismiss}
              aria-label="Dismiss"
              className="press rounded-md p-1 -m-1 text-white/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-baltic-700"
              style={{
                transition: "color 160ms ease, transform 160ms var(--ease-out)",
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
   STICKY CARD — flat panel with a thin top accent bar, mirrored
   from the dashboard so the two pages compose as one space.
   ───────────────────────────────────────────────────────────── */

type Accent = "cream" | "ash" | "baltic";

const ACCENT_FILLS: Record<Accent, { light: string; dark: string }> = {
  cream: { light: "#c7ce64", dark: "#949b31" },
  ash: { light: "#91a989", dark: "#5e7656" },
  baltic: { light: "#808eb3", dark: "#4d5b80" },
};

function StickyCard({
  children,
  accent,
  delay = 0,
  className,
  topFlat = false,
}: {
  children: ReactNode;
  accent?: Accent;
  delay?: number;
  className?: string;
  /**
   * When true, the card's top corners are squared and the cream/ash/baltic
   * accent is suppressed — used by the tasks page so the active subject
   * tab merges flush into the card's top edge.
   */
  topFlat?: boolean;
}) {
  const fill = accent ? ACCENT_FILLS[accent] : null;
  return (
    <div
      className={cn(
        "paper-card sticky-enter relative px-6 pt-7 pb-6 border border-lavender-200/60 dark:border-lavender-800/60 overflow-hidden",
        topFlat && "!rounded-t-none",
        className
      )}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
    >
      {fill && !topFlat && (
        <>
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
        </>
      )}
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
   ADD SUBJECT MODAL — opens from the + at the end of the tab
   row. Name input + a row of color swatches drawn from the
   shared SUBJECT_COLORS palette. Submitting creates the subject
   and switches the active tab to it.
   ───────────────────────────────────────────────────────────── */

function AddSubjectModal({
  open,
  onClose,
  onAdd,
  existingLabels,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (label: string, color: string) => void;
  existingLabels: string[];
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<string>(SUBJECT_COLORS[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setLabel("");
      setColor(SUBJECT_COLORS[0]);
      setError("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    if (
      existingLabels.some((l) => l.toLowerCase() === trimmed.toLowerCase())
    ) {
      setError("A subject with that name already exists.");
      return;
    }
    onAdd(trimmed, color);
  };

  return (
    <Modal open={open} onClose={onClose} title="New subject" width="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="subject-label"
          label="Name"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            if (error) setError("");
          }}
          placeholder="e.g. Linear algebra"
          autoFocus
          maxLength={30}
          error={error || undefined}
        />

        <div className="space-y-2">
          <label className="text-label text-baltic-600 dark:text-baltic-300">
            Color
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {SUBJECT_COLORS.map((c) => {
              const isSelected = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Use color ${c}`}
                  aria-pressed={isSelected}
                  className={cn(
                    "press relative w-7 h-7 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-lavender-900",
                    isSelected
                      ? "ring-2 ring-offset-2 ring-baltic-500 dark:ring-baltic-400 dark:ring-offset-lavender-900"
                      : "hover:scale-110"
                  )}
                  style={{
                    backgroundColor: c,
                    transition:
                      "transform 160ms var(--ease-out), box-shadow 160ms ease",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Quiet preview row so the user sees the tab they're about to make */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-lavender-50 dark:bg-lavender-900/40 border border-lavender-200/70 dark:border-lavender-800/60">
          <span
            aria-hidden
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-semibold text-baltic-800 dark:text-baltic-100 truncate">
            {label.trim() || "Subject preview"}
          </span>
          <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.18em] text-steel-400">
            preview
          </span>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!label.trim()}>
            Add subject
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
   ADD TASK MODAL — same fields, calmer composition. Subject and
   priority are chip selectors so the form reads as one rhythm
   instead of a stack of mismatched inputs.
   ───────────────────────────────────────────────────────────── */

function AddTaskModal({
  open,
  onClose,
  onAdd,
  initialSubject,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, "id" | "createdAt" | "completed">) => void;
  initialSubject?: string | null;
}) {
  const { subjects } = useSubjects();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<string>(
    initialSubject || subjects[0]?.label || ""
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    if (open && initialSubject) {
      setSubject(initialSubject);
    }
  }, [open, initialSubject]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) return;
      onAdd({
        title: title.trim(),
        description: description.trim(),
        subject,
        priority,
        dueDate,
      });
      setTitle("");
      setDescription("");
      setSubject(subjects[0]?.label || "");
      setPriority("medium");
      setDueDate(new Date().toISOString().split("T")[0]);
      onClose();
    },
    [
      title,
      description,
      subject,
      priority,
      dueDate,
      onAdd,
      onClose,
      subjects,
    ]
  );

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="task-title"
          label="Title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <div className="space-y-1.5">
          <label className="text-label text-baltic-600 dark:text-baltic-300">
            Description
          </label>
          <textarea
            className="w-full px-3 py-2 text-sm rounded-xl border border-lavender-200 dark:border-lavender-700 bg-white dark:bg-lavender-900 text-baltic-800 dark:text-baltic-100 placeholder:text-steel-400 outline-none focus:ring-2 focus:ring-baltic-400/30 focus:border-baltic-400 transition-smooth resize-none"
            rows={2}
            placeholder="Additional details (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Subject — chip selector, color-dot per option */}
        <div className="space-y-1.5">
          <label className="text-label text-baltic-600 dark:text-baltic-300">
            Subject
          </label>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((sub) => {
              const isActive = subject === sub.label;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubject(sub.label)}
                  className={cn(
                    "press inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70",
                    isActive
                      ? "bg-white dark:bg-lavender-900 border-lavender-300 dark:border-lavender-700 shadow-sm text-baltic-800 dark:text-baltic-100"
                      : "border-transparent text-steel-500 dark:text-steel-400 hover:bg-lavender-50 dark:hover:bg-lavender-900/40"
                  )}
                  style={{
                    transition:
                      "background-color 160ms ease, color 160ms ease, transform 160ms var(--ease-out), border-color 160ms ease",
                  }}
                >
                  <span
                    aria-hidden
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: sub.color,
                      opacity: isActive ? 1 : 0.55,
                    }}
                  />
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-label text-baltic-600 dark:text-baltic-300">
              Due date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-lavender-200 dark:border-lavender-700 bg-white dark:bg-lavender-900 text-baltic-800 dark:text-baltic-100 outline-none focus:ring-2 focus:ring-baltic-400/30 focus:border-baltic-400 transition-smooth"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-label text-baltic-600 dark:text-baltic-300">
              Priority
            </label>
            <div className="flex gap-1">
              {(["low", "medium", "high"] as const).map((p) => {
                const isActive = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "press flex-1 py-2 rounded-xl text-xs font-medium border focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70",
                      isActive
                        ? "border-baltic-400 bg-baltic-50 text-baltic-800 dark:bg-baltic-900/60 dark:text-baltic-200 dark:border-baltic-600"
                        : "border-lavender-200 dark:border-lavender-700 text-steel-500 hover:border-lavender-300 dark:hover:border-lavender-600"
                    )}
                    style={{
                      transition:
                        "background-color 160ms ease, color 160ms ease, transform 160ms var(--ease-out), border-color 160ms ease",
                    }}
                  >
                    {PRIORITIES[p].label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim()}>
            Create task
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
   TASK DETAIL MODAL — quiet meta row of chips, description
   block, then the action row. Subject + priority + due read as
   facts, not as decoration.
   ───────────────────────────────────────────────────────────── */

function TaskDetailModal({
  task,
  subject,
  onClose,
  onToggle,
  onDelete,
}: {
  task: Task;
  subject: UserSubject | undefined;
  onClose: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const color = subject?.color || "#9faac6";
  const overdue = !task.completed && isOverdue(task.dueDate);
  const priorityColor = PRIORITIES[task.priority].color;

  return (
    <Modal open={true} onClose={onClose} title={task.title} width="sm">
      <div className="space-y-5">
        {/* Meta chip row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-baltic-50 dark:bg-baltic-900/40 text-baltic-700 dark:text-baltic-300"
          >
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {subject?.label || task.subject}
          </span>
          <span
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: priorityColor + "1a",
              color: priorityColor,
            }}
          >
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: priorityColor }}
            />
            {PRIORITIES[task.priority].label} priority
          </span>
          {task.completed && (
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-ash-50 dark:bg-ash-900/30 text-ash-700 dark:text-ash-400">
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-ash-500" />
              Completed
            </span>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-steel-600 dark:text-steel-300 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.16em] text-steel-400 dark:text-steel-500">
          <span>
            Due {formatDate(task.dueDate)}
            {overdue && (
              <span className="text-red-500 dark:text-red-400 ml-1.5 font-semibold normal-case tracking-normal">
                · Overdue
              </span>
            )}
          </span>
          {task.createdAt && (
            <>
              <span aria-hidden className="text-steel-300 dark:text-steel-600">
                ·
              </span>
              <span>
                Added {formatDate(task.createdAt.split("T")[0])}
              </span>
            </>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t border-lavender-100 dark:border-lavender-800/60">
          <Button variant="secondary" onClick={onToggle} className="flex-1">
            {task.completed ? "Mark pending" : "Mark complete"}
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
