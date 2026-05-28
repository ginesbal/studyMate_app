"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
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
  generateId,
  todayISO,
} from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

type StatusFilter = "pending" | "completed" | "all";

/**
 * A SubjectTab is a saved view, intentionally separate from a Subject.
 * Closing a tab removes the view; subjects (and their tasks) are
 * untouched. Multiple tabs can point to the same subject (with their
 * own custom label and status filter) so a student can keep, say, an
 * "Algebra — exam prep" tab and an "Algebra — daily" tab side by side.
 */
interface SubjectTab {
  id: string;
  /** null = the "All" view; otherwise the subject's label */
  subjectLabel: string | null;
  /** null = use the subject's label (or "All") */
  customLabel: string | null;
  statusFilter: StatusFilter;
}

const TABS_STORAGE_KEY = "aim_tabs";
const ALL_TAB_LABEL = "All";
const UNDO_TIMEOUT_MS = 5000;

/**
 * Run `onFire` after `ms` of *visible* time, not wall time. When the tab is
 * hidden mid-countdown we freeze the timer; on return we resume with whatever
 * time was left. The principle: a 5-second undo should mean five seconds the
 * user could actually see — Sonner does the same for toasts.
 */
function useVisibilityAwareTimeout(
  active: boolean,
  ms: number,
  onFire: () => void
) {
  // Stash onFire in a ref so the effect doesn't restart every render
  // (a fresh inline callback would otherwise reset the timer each tick).
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;

  useEffect(() => {
    if (!active) return;
    let remaining = ms;
    let startedAt = performance.now();
    let id: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      id = setTimeout(() => {
        id = null;
        onFireRef.current();
      }, remaining);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (id !== null) {
          clearTimeout(id);
          remaining = Math.max(0, remaining - (performance.now() - startedAt));
          id = null;
        }
      } else if (id === null) {
        startedAt = performance.now();
        schedule();
      }
    };

    schedule();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (id !== null) clearTimeout(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [active, ms]);
}

function loadStoredTabs(): SubjectTab[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TABS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as SubjectTab[];
  } catch {
    return null;
  }
}

function persistTabs(tabs: SubjectTab[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    /* quota / privacy mode — accept the loss */
  }
}

function buildDefaultTabs(subjects: UserSubject[]): SubjectTab[] {
  return [
    {
      id: generateId(),
      subjectLabel: null,
      customLabel: null,
      statusFilter: "pending",
    },
    ...subjects.map((s) => ({
      id: generateId(),
      subjectLabel: s.label,
      customLabel: null,
      statusFilter: "pending" as const,
    })),
  ];
}

function tabDisplayLabel(tab: SubjectTab): string {
  if (tab.customLabel && tab.customLabel.trim().length > 0) {
    return tab.customLabel;
  }
  return tab.subjectLabel ?? ALL_TAB_LABEL;
}

export default function TasksPage() {
  const { tasks, addTask, updateTask, toggleComplete, deleteTask, reassignTasks } =
    useTasks();
  const { subjects, getSubject, addSubject, updateSubject, deleteSubject } =
    useSubjects();

  // Tabs are saved views. They live in their own collection so closing
  // a tab is non-destructive — the underlying subject and its tasks
  // stay intact, the view just stops being shown.
  //
  // Initialise synchronously via a ref so tabs + activeTabId share the
  // same seed (buildDefaultTabs generates fresh ids per call, so we'd
  // otherwise risk a mismatch). The providers gate render until they're
  // mounted, so localStorage is always available here.
  const initialTabsRef = useRef<SubjectTab[] | null>(null);
  if (initialTabsRef.current === null) {
    const stored = loadStoredTabs();
    initialTabsRef.current =
      stored && stored.length > 0 ? stored : buildDefaultTabs(subjects);
  }
  const [tabs, setTabs] = useState<SubjectTab[]>(initialTabsRef.current);
  const [activeTabId, setActiveTabId] = useState<string>(
    initialTabsRef.current[0]?.id ?? ""
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalSubject, setAddModalSubject] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  // A non-null editingTask opens the task form in edit mode. It's the
  // same modal used for "New task", just pre-filled and saving via
  // updateTask instead of addTask.
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showManageSubjects, setShowManageSubjects] = useState(false);

  // Persist on change. No tabsLoaded gate needed because the lazy init
  // above guarantees `tabs` is never the placeholder `[]` when this runs.
  useEffect(() => {
    persistTabs(tabs);
  }, [tabs]);

  // Orphan cleanup. If a subject was deleted out from under us (e.g.
  // via Settings → Manage subjects in the future), drop any tabs
  // pointing at it.
  useEffect(() => {
    const validLabels = new Set(subjects.map((s) => s.label));
    setTabs((prev) => {
      const next = prev.filter(
        (t) => t.subjectLabel === null || validLabels.has(t.subjectLabel)
      );
      return next.length === prev.length ? prev : next;
    });
  }, [subjects]);

  // If the active tab disappeared (cleanup or a close that didn't
  // pick a fallback because it was racing), reactivate the first
  // remaining tab.
  useEffect(() => {
    if (tabs.length === 0) return;
    if (!tabs.some((t) => t.id === activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  // Inline undo for Mark done. Visibility-aware: the 5s pauses while the
  // tab is hidden, so a user who alt-tabs away still sees the banner on
  // return instead of finding it silently expired.
  const [lastDone, setLastDone] = useState<{ id: string; title: string } | null>(null);
  useVisibilityAwareTimeout(lastDone !== null, UNDO_TIMEOUT_MS, () =>
    setLastDone(null)
  );

  // Inline undo for closing a tab. Captures the position too so undo
  // restores the tab in its original spot, not at the end.
  const [lastClosedTab, setLastClosedTab] = useState<{
    tab: SubjectTab;
    position: number;
  } | null>(null);
  useVisibilityAwareTimeout(lastClosedTab !== null, UNDO_TIMEOUT_MS, () =>
    setLastClosedTab(null)
  );

  // ── Tab operations ────────────────────────────────────────

  const handleAddTabForSubject = useCallback(
    (subjectLabel: string | null) => {
      const newTab: SubjectTab = {
        id: generateId(),
        subjectLabel,
        customLabel: null,
        statusFilter: "pending",
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    },
    []
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      const idx = tabs.findIndex((t) => t.id === tabId);
      if (idx === -1) return;
      const closed = tabs[idx];
      const next = tabs.filter((t) => t.id !== tabId);
      setTabs(next);
      setLastClosedTab({ tab: closed, position: idx });
      // If we closed the active tab, fall back to the neighbour at the
      // same index (or the last remaining tab if we just removed the
      // tail). Browsers do the same.
      if (activeTabId === tabId && next.length > 0) {
        const fallback = next[Math.min(idx, next.length - 1)] ?? next[0];
        setActiveTabId(fallback.id);
      }
    },
    [tabs, activeTabId]
  );

  const handleUndoCloseTab = useCallback(() => {
    if (!lastClosedTab) return;
    const { tab, position } = lastClosedTab;
    setTabs((prev) => {
      const next = [...prev];
      next.splice(Math.min(position, next.length), 0, tab);
      return next;
    });
    setActiveTabId(tab.id);
    setLastClosedTab(null);
  }, [lastClosedTab]);

  const handleRenameTab = useCallback((tabId: string, label: string) => {
    const trimmed = label.trim();
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, customLabel: trimmed.length > 0 ? trimmed : null } : t
      )
    );
  }, []);

  const handleSetActiveFilter = useCallback(
    (filter: StatusFilter) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, statusFilter: filter } : t
        )
      );
    },
    [activeTabId]
  );

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
      handleAddTabForSubject(trimmed);
      setShowAddSubject(false);
    },
    [subjects, addSubject, handleAddTabForSubject]
  );

  // Rename/recolor a subject. A label change has to cascade: tasks store
  // the subject by label, and so do the saved tab views — rename without
  // the cascade would orphan every task under the old name.
  const handleRenameSubject = useCallback(
    (id: string, newLabel: string, newColor: string) => {
      const trimmed = newLabel.trim();
      if (!trimmed) return;
      const subject = subjects.find((s) => s.id === id);
      if (!subject) return;
      const taken = subjects.some(
        (s) => s.id !== id && s.label.toLowerCase() === trimmed.toLowerCase()
      );
      if (taken) return;
      updateSubject(id, { label: trimmed, color: newColor });
      if (trimmed !== subject.label) {
        reassignTasks(subject.label, trimmed);
        setTabs((prev) =>
          prev.map((t) =>
            t.subjectLabel === subject.label
              ? { ...t, subjectLabel: trimmed }
              : t
          )
        );
      }
    },
    [subjects, updateSubject, reassignTasks]
  );

  // Delete a subject. Its tab views are dropped by the orphan-cleanup
  // effect; tasks keep their label and become "unfiled" (recreating the
  // subject with the same name re-files them), so nothing is destroyed.
  const handleDeleteSubject = useCallback(
    (id: string) => {
      deleteSubject(id);
    },
    [deleteSubject]
  );

  // ── Derived state from active tab ─────────────────────────

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0] ?? null;
  const activeSubjectLabel = activeTab?.subjectLabel ?? null;
  const activeFilter: StatusFilter = activeTab?.statusFilter ?? "pending";

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
    activeSubjectLabel === null
      ? stats.all
      : stats.bySubject[activeSubjectLabel] || {
          pending: 0,
          completed: 0,
          overdue: 0,
          total: 0,
        };

  // Total tasks per subject, for the manage-subjects modal's "n tasks" hint.
  const subjectTaskCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of subjects) m[s.label] = stats.bySubject[s.label]?.total ?? 0;
    return m;
  }, [subjects, stats]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (activeSubjectLabel !== null) {
      result = result.filter((t) => t.subject === activeSubjectLabel);
    }
    if (activeFilter === "pending") {
      result = result.filter((t) => !t.completed);
    } else if (activeFilter === "completed") {
      result = result.filter((t) => t.completed);
    }
    return [...result].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const aOverdue = !a.completed && isOverdue(a.dueDate);
      const bOverdue = !b.completed && isOverdue(b.dueDate);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      const dateDiff =
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      // Same day → higher priority floats up, so within a bucket (where
      // every task shares a due date) the urgent ones lead.
      const rank = { high: 0, medium: 1, low: 2 } as const;
      return rank[a.priority] - rank[b.priority];
    });
  }, [tasks, activeSubjectLabel, activeFilter]);

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
    setAddModalSubject(activeSubjectLabel);
    setShowAddModal(true);
  }, [activeSubjectLabel]);

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
        {/* pt-1 gives the cap tops room: Plus Jakarta Sans' natural line
            box is ~1.27, so leading-[1.1] alone lets the glyph tops sit
            above the box and clip. Padding (not a taller line-height)
            keeps the highlighter swipe aligned to the text. */}
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-baltic-800 dark:text-baltic-100 leading-[1.1] pt-1">
          <span className="highlighter">Tasks</span>
          <span className="text-baltic-600 dark:text-baltic-300">.</span>
        </h1>
        <p className="mt-3 text-sm text-steel-500 dark:text-steel-400 max-w-md">
          {headlineSub(stats.all)}
        </p>
      </header>

      {/* ── SUBJECT TABS — browser-style. Each tab is an independent
            view; closing one is non-destructive (subjects/tasks survive),
            so accidental close + the 5s undo banner is total recovery. ── */}
      <SubjectTabs
        tabs={tabs}
        activeTabId={activeTab?.id ?? ""}
        subjects={subjects}
        counts={stats.bySubject}
        totalPending={stats.all.pending}
        onSelect={setActiveTabId}
        onClose={handleCloseTab}
        onRename={handleRenameTab}
        onAddTabForSubject={handleAddTabForSubject}
        onCreateNewSubject={() => setShowAddSubject(true)}
        onManageSubjects={() => setShowManageSubjects(true)}
      />

      {/* ── LIST — paper surface, top corners squared so the tabs above
            merge in with no visible seam. Subject color shows as the
            active tab's top stripe (browser theme-line), not as a band
            across the card. ── */}
      <StickyCard topFlat delay={140}>
        <div
          id={TABPANEL_ID}
          role="tabpanel"
          aria-labelledby={TABLIST_ID}
        >
        {/* Eyebrow row — context label, counts, status pills, new button */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <CardEyebrow>
            {activeTab && activeTab.subjectLabel === null && !activeTab.customLabel
              ? "All tasks"
              : activeTab
              ? tabDisplayLabel(activeTab)
              : "All tasks"}
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
            <StatusFilterPills
              value={activeFilter}
              onChange={handleSetActiveFilter}
            />
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
            filterStatus={activeFilter}
            activeSubjectLabel={activeSubjectLabel}
            hasAnyTasks={tasks.length > 0}
            onAdd={handleNewTask}
            onShowPending={() => handleSetActiveFilter("pending")}
          />
        ) : (
          <div className="space-y-6">
            {dayGroups.map((g, gi) => (
              <DayGroup
                key={g.label}
                label={g.label}
                tasks={g.tasks}
                showSubject={activeSubjectLabel === null}
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
        </div>
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

      {/* Tab-close undo — restores the closed tab at its original
          position so the row order is preserved. */}
      <CloseTabUndoSlot
        item={lastClosedTab}
        getSubject={getSubject}
        onUndo={handleUndoCloseTab}
        onDismiss={() => setLastClosedTab(null)}
      />

      {/* Modals */}
      <AddSubjectModal
        open={showAddSubject}
        onClose={() => setShowAddSubject(false)}
        onAdd={handleCreateSubject}
        existingLabels={subjects.map((s) => s.label)}
      />

      <ManageSubjectsModal
        open={showManageSubjects}
        onClose={() => setShowManageSubjects(false)}
        subjects={subjects}
        counts={subjectTaskCounts}
        onRename={handleRenameSubject}
        onDelete={handleDeleteSubject}
      />

      <AddTaskModal
        open={showAddModal || editingTask !== null}
        editingTask={editingTask}
        onClose={() => {
          setShowAddModal(false);
          setAddModalSubject(null);
          setEditingTask(null);
        }}
        onAdd={addTask}
        onUpdate={updateTask}
        initialSubject={addModalSubject}
      />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          subject={getSubject(selectedTask.subject)}
          onClose={() => setSelectedTask(null)}
          onEdit={() => {
            setEditingTask(selectedTask);
            setSelectedTask(null);
          }}
          onToggle={() => {
            // Completing from the detail modal gets the same 5s undo as the
            // row checkbox; marking pending again just toggles.
            if (!selectedTask.completed) {
              setLastDone({ id: selectedTask.id, title: selectedTask.title });
            }
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
   SUBJECT TABS — browser-style. Tabs are saved views (separate
   from subjects), so closing one is non-destructive and adding
   the same subject twice is allowed. The active tab merges into
   the card via a 1px overlap (z-10 + -mb-px). Subject color
   shows as a 2px stripe along the active tab's TOP edge — same
   place a browser puts its theme color line.

   Layout intentionally has NO horizontal scroll. Inactive tabs
   flex-shrink with truncated labels — like Chrome — so the row
   stays a glanceable strip even with many subjects. The active
   tab is flex-shrink-0 so what you're viewing is always fully
   readable.

   Affordances per tab:
   - One-click select
   - One-click × close (undo lives in the banner below the list).
     The "All" tab is the home view — not closable.
   - Double-click label → inline rename (Enter saves, Esc cancels)

   Trailing slot is a + that opens an anchored popover listing
   every subject (click to add a tab — duplicates allowed) with a
   "New subject…" footer that opens the existing modal.
   ───────────────────────────────────────────────────────────── */

const TABLIST_ID = "tasks-tabs";
const TABPANEL_ID = "tasks-panel";

type TabMoveDirection = "prev" | "next" | "first" | "last";

function SubjectTabs({
  tabs,
  activeTabId,
  subjects,
  counts,
  totalPending,
  onSelect,
  onClose,
  onRename,
  onAddTabForSubject,
  onCreateNewSubject,
  onManageSubjects,
}: {
  tabs: SubjectTab[];
  activeTabId: string;
  subjects: UserSubject[];
  counts: Record<string, { pending: number }>;
  totalPending: number;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onRename: (tabId: string, label: string) => void;
  onAddTabForSubject: (subjectLabel: string | null) => void;
  onCreateNewSubject: () => void;
  onManageSubjects: () => void;
}) {
  // Refs keyed by tab id so arrow-key navigation can move focus without
  // touching the DOM directly from a child. WAI-ARIA tablist pattern.
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleMoveFocus = useCallback(
    (fromTabId: string, direction: TabMoveDirection) => {
      if (tabs.length === 0) return;
      const idx = tabs.findIndex((t) => t.id === fromTabId);
      if (idx === -1) return;
      const targetIdx =
        direction === "prev"
          ? (idx - 1 + tabs.length) % tabs.length
          : direction === "next"
          ? (idx + 1) % tabs.length
          : direction === "first"
          ? 0
          : tabs.length - 1;
      const target = tabs[targetIdx];
      if (!target || target.id === fromTabId) return;
      onSelect(target.id);
      // Focus on the next frame so the new tabindex=0 has been applied.
      requestAnimationFrame(() => {
        tabRefs.current[target.id]?.focus();
      });
    },
    [tabs, onSelect]
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

      <div className="flex items-end gap-1">
        {/* Scrollable strip — on a narrow screen the tabs overflow to a
            horizontal scroll (scrollbar hidden) instead of clipping or
            shoving the + off-screen. The + sits OUTSIDE this container so
            its popover isn't clipped by the scroll overflow, and it never
            scrolls away. */}
        <div
          id={TABLIST_ID}
          role="tablist"
          aria-orientation="horizontal"
          className="flex items-end gap-0.5 pt-1 px-1 overflow-x-auto no-scrollbar flex-1 min-w-0"
        >
          {tabs.map((tab) => {
            const subject =
              tab.subjectLabel === null
                ? null
                : subjects.find((s) => s.label === tab.subjectLabel) ?? null;
            const color = subject?.color ?? "#9faac6";
            const pending =
              tab.subjectLabel === null
                ? totalPending
                : counts[tab.subjectLabel]?.pending ?? 0;
            // The "All" tab is the home view — never closable. Subject
            // tabs are always closable; even the last one of a kind, since
            // the user can re-open from the + popover.
            const closable = tab.subjectLabel !== null;
            return (
              <SubjectTab
                key={tab.id}
                tab={tab}
                color={color}
                pending={pending}
                isActive={tab.id === activeTabId}
                closable={closable}
                tabPanelId={TABPANEL_ID}
                tabRef={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                onSelect={() => onSelect(tab.id)}
                onClose={() => onClose(tab.id)}
                onRename={(label) => onRename(tab.id, label)}
                onMoveFocus={(direction) => handleMoveFocus(tab.id, direction)}
              />
            );
          })}
        </div>

        <AddTabButton
          subjects={subjects}
          onAddTabForSubject={onAddTabForSubject}
          onCreateNewSubject={onCreateNewSubject}
          onManageSubjects={onManageSubjects}
        />
      </div>
    </div>
  );
}

function SubjectTab({
  tab,
  color,
  pending,
  isActive,
  closable,
  tabPanelId,
  tabRef,
  onSelect,
  onClose,
  onRename,
  onMoveFocus,
}: {
  tab: SubjectTab;
  color: string;
  pending: number;
  isActive: boolean;
  closable: boolean;
  tabPanelId: string;
  tabRef: (el: HTMLDivElement | null) => void;
  onSelect: () => void;
  onClose: () => void;
  onRename: (label: string) => void;
  onMoveFocus: (direction: TabMoveDirection) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayLabel = tabDisplayLabel(tab);

  const startEdit = useCallback(() => {
    setDraft(displayLabel);
    setEditing(true);
  }, [displayLabel]);

  // Focus + select input contents once it mounts.
  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing]);

  const commit = useCallback(() => {
    onRename(draft);
    setEditing(false);
  }, [draft, onRename]);

  const cancel = useCallback(() => {
    setEditing(false);
    setDraft("");
  }, []);

  return (
    <div
      ref={tabRef}
      role="tab"
      tabIndex={editing ? -1 : isActive ? 0 : -1}
      aria-selected={isActive}
      aria-controls={tabPanelId}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (editing) return;
        // Activation
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
          return;
        }
        // WAI-ARIA tablist navigation. Left/Right cycle, Home/End jump.
        // Selecting also moves focus (auto-activate, the common pattern).
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onMoveFocus("prev");
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onMoveFocus("next");
        } else if (e.key === "Home") {
          e.preventDefault();
          onMoveFocus("first");
        } else if (e.key === "End") {
          e.preventDefault();
          onMoveFocus("last");
        }
      }}
      className={cn(
        "press group relative inline-flex items-center gap-2 whitespace-nowrap cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950",
        // Active stays readable but is capped so a long custom label can't
        // shove the + button off-screen. Inactive flex-shrinks aggressively
        // with a truncated label so the row never needs horizontal scroll.
        isActive
          ? cn(
              "flex-shrink-0 max-w-[18rem] z-10 py-2 rounded-t-xl bg-white dark:bg-lavender-900 border border-b-0 border-lavender-200/60 dark:border-lavender-800/60 text-baltic-800 dark:text-baltic-100 overflow-hidden",
              // The All tab has no close button, so even padding keeps its
              // label balanced instead of tucked toward the right edge.
              closable ? "pl-4 pr-2" : "px-4",
            )
          : "min-w-[5rem] max-w-[10rem] px-3 py-2 rounded-t-lg border border-b-0 border-lavender-200/40 dark:border-lavender-800/40 text-steel-500 dark:text-steel-400 hover:text-baltic-700 dark:hover:text-baltic-300 hover:border-lavender-200/70 dark:hover:border-lavender-700/60 hover:bg-baltic-50/60 dark:hover:bg-baltic-900/30"
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
          style={{ backgroundColor: color }}
        />
      )}

      <span
        aria-hidden
        // Opacity moved off inline-style so group-hover/focus can lift the
        // inactive dot. Tiny unseen detail — the dot "notices" the cursor.
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          isActive
            ? "opacity-100"
            : "opacity-[0.55] group-hover:opacity-90 group-focus-within:opacity-90"
        )}
        style={{
          backgroundColor: color,
          transition: "opacity 180ms var(--ease-out)",
        }}
      />

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          aria-label="Tab name"
          maxLength={40}
          className="bg-transparent outline-none text-xs font-semibold text-baltic-800 dark:text-baltic-100 min-w-[3rem] w-[16ch] max-w-full focus:ring-1 focus:ring-baltic-400/40 rounded-sm px-0.5"
        />
      ) : (
        <span
          onDoubleClick={(e) => {
            e.stopPropagation();
            // Only the active tab gets quick rename — for an inactive
            // tab the first dblclick activates it (via the click) and
            // the second is "go again". Gating rename on isActive
            // avoids surprising edits.
            if (isActive) startEdit();
          }}
          className={cn(
            "text-xs truncate min-w-0",
            isActive ? "font-semibold" : "font-medium"
          )}
          title={isActive ? "Double-click to rename" : displayLabel}
        >
          {displayLabel}
        </span>
      )}

      {!editing && pending > 0 && (
        <span
          className={cn(
            "tabular-nums text-[10px] font-mono flex-shrink-0",
            isActive
              ? "text-baltic-500 dark:text-baltic-400"
              : "text-steel-300 dark:text-steel-600"
          )}
        >
          {pending}
        </span>
      )}

      {/* Close — visible on active, fades in on hover for inactive.
          The "All" tab is non-closable (closable=false). */}
      {!editing && closable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`Close ${displayLabel}`}
          className={cn(
            "press flex items-center justify-center w-[18px] h-[18px] rounded-full flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70",
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

/* ─────────────────────────────────────────────────────────────
   ADD-TAB BUTTON + POPOVER — anchored dropdown. Lists every
   subject (with its color dot); click a subject to add a tab
   for it (duplicates allowed). Footer is "New subject…" which
   opens the existing creation modal. Closes on outside click
   or Escape so the popover never gets stuck.
   ───────────────────────────────────────────────────────────── */

const POPOVER_WIDTH_PX = 240; // matches w-60 below — kept in sync for measurement
const POPOVER_VIEWPORT_PAD_PX = 16;

function AddTabButton({
  subjects,
  onAddTabForSubject,
  onCreateNewSubject,
  onManageSubjects,
}: {
  subjects: UserSubject[];
  onAddTabForSubject: (subjectLabel: string | null) => void;
  onCreateNewSubject: () => void;
  onManageSubjects: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Which edge the popover anchors to. Default left (extend right). Flip to
  // right (extend left) when the button is near the viewport right edge so
  // the menu never overflows the page — typical case when many tabs push
  // the + to the far right of the row.
  const [alignRight, setAlignRight] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Measure on open: if anchoring left would overflow the viewport, flip
  // to right-anchored. useLayoutEffect so we pick the side before paint
  // and the menu never "jumps" after first render.
  useLayoutEffect(() => {
    if (!open) return;
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const overflowsRight =
      rect.left + POPOVER_WIDTH_PX > window.innerWidth - POPOVER_VIEWPORT_PAD_PX;
    setAlignRight(overflowsRight);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative ml-1 mb-0.5 flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Add tab"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Add tab"
        className={cn(
          "press inline-flex items-center justify-center w-7 h-7 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baltic-950",
          open
            ? "bg-white dark:bg-lavender-900 text-baltic-700 dark:text-baltic-200 shadow-sm"
            : "text-steel-400 dark:text-steel-500 hover:text-baltic-700 dark:hover:text-baltic-200 hover:bg-baltic-50/60 dark:hover:bg-baltic-900/30"
        )}
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

      {open && (
        <div
          role="menu"
          className={cn(
            "dropdown-enter absolute top-full mt-1.5 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-lavender-200/80 dark:border-lavender-800/70 bg-white dark:bg-lavender-900 shadow-[0_10px_28px_-12px_rgba(38,45,64,0.18),0_4px_10px_-4px_rgba(38,45,64,0.10)] dark:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.55)] overflow-hidden z-50",
            alignRight ? "right-0" : "left-0"
          )}
          // Scale from the corner that touches the trigger (the + button) so the
          // motion reads as "growing out of the button" rather than appearing from
          // nowhere. Overrides the .dropdown-enter default of `top center`.
          style={{ transformOrigin: alignRight ? "top right" : "top left" }}
        >
          <div className="px-3 pt-2.5 pb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-steel-500 dark:text-steel-400">
              Add tab for
            </p>
          </div>
          <ul className="max-h-64 overflow-y-auto pb-1">
            {subjects.length === 0 ? (
              <li className="px-3 py-2 text-xs text-steel-400 dark:text-steel-500">
                No subjects yet.
              </li>
            ) : (
              subjects.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onAddTabForSubject(s.label);
                      setOpen(false);
                    }}
                    className="press w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-lavender-50 dark:hover:bg-lavender-800/60 focus:outline-none focus:bg-lavender-50 dark:focus:bg-lavender-800/60"
                    style={{
                      transition:
                        "background-color 160ms ease, transform 160ms var(--ease-out)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-xs font-medium text-baltic-700 dark:text-baltic-300 truncate">
                      {s.label}
                    </span>
                    <span className="ml-auto text-[10px] font-mono text-steel-300 dark:text-steel-600">
                      tab
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-lavender-100 dark:border-lavender-800/60">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onCreateNewSubject();
                setOpen(false);
              }}
              className="press w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-baltic-700 dark:text-baltic-300 hover:bg-lavender-50 dark:hover:bg-lavender-800/60 focus:outline-none focus:bg-lavender-50 dark:focus:bg-lavender-800/60"
              style={{
                transition:
                  "background-color 160ms ease, transform 160ms var(--ease-out)",
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M6 2v8M2 6h8" />
              </svg>
              New subject…
            </button>
            {subjects.length > 0 && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onManageSubjects();
                  setOpen(false);
                }}
                className="press w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-steel-500 dark:text-steel-400 hover:text-baltic-700 dark:hover:text-baltic-300 hover:bg-lavender-50 dark:hover:bg-lavender-800/60 focus:outline-none focus:bg-lavender-50 dark:focus:bg-lavender-800/60"
                style={{
                  transition:
                    "background-color 160ms ease, color 160ms ease, transform 160ms var(--ease-out)",
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M2 3h8M2 6h8M2 9h5" />
                </svg>
                Rename or delete…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
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
        // Space + Enter both activate, matching native button semantics.
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
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
  activeSubjectLabel,
  hasAnyTasks,
  onAdd,
  onShowPending,
}: {
  filterStatus: StatusFilter;
  activeSubjectLabel: string | null;
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
  } else if (filterStatus === "all" && activeSubjectLabel !== null) {
    title = `No ${activeSubjectLabel} tasks.`;
    sub = "Add one to keep the subject moving.";
  } else if (activeSubjectLabel !== null) {
    title = `No pending ${activeSubjectLabel} tasks.`;
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
   CLOSE-TAB UNDO SLOT — companion to UndoSlot. Closing a tab is
   one-click and non-destructive; this banner gives 5 seconds to
   restore the tab at its original index. We resolve the subject
   color from the live subjects list so the banner dot matches
   what the tab will look like once it returns.
   ───────────────────────────────────────────────────────────── */

function CloseTabUndoSlot({
  item,
  getSubject,
  onUndo,
  onDismiss,
}: {
  item: { tab: SubjectTab; position: number } | null;
  getSubject: (idOrLabel: string) => UserSubject | undefined;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const dot =
    item === null
      ? "#9faac6"
      : item.tab.subjectLabel === null
      ? "#9faac6"
      : getSubject(item.tab.subjectLabel)?.color ?? "#9faac6";
  const label = item ? tabDisplayLabel(item.tab) : "";

  return (
    <div className="min-h-[2.75rem] mt-2 flex items-center" aria-live="polite">
      {item && (
        <div
          role="status"
          className="sticky-enter w-full inline-flex items-center justify-between gap-3 px-4 py-2 rounded-full bg-baltic-700 dark:bg-baltic-800 text-white text-xs shadow-sm"
          style={{ "--delay": "0ms" } as CSSProperties}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <span
              aria-hidden
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: dot }}
            />
            <span className="font-semibold flex-shrink-0">Tab closed.</span>
            <span className="truncate text-white/70">{label}</span>
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
        // `isolate` confines the card's internal z-index (paper-card ::after at
        // z:0, inner content at z:10) to a private stacking context, so the
        // tab row's z-10 above the card paints cleanly and any popover anchored
        // in the row (e.g. AddTabButton) renders over the card content instead
        // of slipping behind it.
        "paper-card sticky-enter relative isolate px-6 pt-7 pb-6 border border-lavender-200/60 dark:border-lavender-800/60 overflow-hidden",
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
   MANAGE SUBJECTS MODAL — rename (with task + tab cascade),
   recolor, or delete. Renaming re-labels every task under the old
   name so nothing is orphaned; deleting drops the subject's tab
   views and leaves its tasks unfiled (recreating the subject by
   name re-files them), so a delete is recoverable, not destructive.
   ───────────────────────────────────────────────────────────── */

function ManageSubjectsModal({
  open,
  onClose,
  subjects,
  counts,
  onRename,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  subjects: UserSubject[];
  counts: Record<string, number>;
  onRename: (id: string, label: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftColor, setDraftColor] = useState<string>(SUBJECT_COLORS[0]);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEditingId(null);
      setDraftLabel("");
      setError("");
      setConfirmDeleteId(null);
    }
  }, [open]);

  const startEdit = (s: UserSubject) => {
    setConfirmDeleteId(null);
    setError("");
    setDraftLabel(s.label);
    setDraftColor(s.color);
    setEditingId(s.id);
  };

  const commitEdit = (s: UserSubject) => {
    const trimmed = draftLabel.trim();
    if (!trimmed) {
      setError("Name can't be empty.");
      return;
    }
    if (
      subjects.some(
        (o) => o.id !== s.id && o.label.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setError("Another subject already has that name.");
      return;
    }
    onRename(s.id, trimmed, draftColor);
    setEditingId(null);
    setError("");
  };

  const requestDelete = (s: UserSubject) => {
    if (confirmDeleteId === s.id) {
      onDelete(s.id);
      setConfirmDeleteId(null);
    } else {
      setEditingId(null);
      setConfirmDeleteId(s.id);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage subjects" width="sm">
      {subjects.length === 0 ? (
        <p className="text-sm text-steel-500 dark:text-steel-400 py-2">
          No subjects yet. Add one from the + on the tab row.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-[60vh] overflow-y-auto -mx-1 px-1">
          {subjects.map((s) => {
            const isEditing = editingId === s.id;
            const isConfirming = confirmDeleteId === s.id;
            const count = counts[s.label] ?? 0;
            return (
              <li
                key={s.id}
                className="rounded-xl border border-lavender-200/70 dark:border-lavender-800/60 px-3 py-2.5"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      autoFocus
                      value={draftLabel}
                      onChange={(e) => {
                        setDraftLabel(e.target.value);
                        if (error) setError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitEdit(s);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingId(null);
                          setError("");
                        }
                      }}
                      maxLength={30}
                      aria-label="Subject name"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 dark:border-lavender-700 bg-white dark:bg-lavender-900 text-baltic-800 dark:text-baltic-100 placeholder:text-steel-400 outline-none focus:ring-2 focus:ring-baltic-400/30 focus:border-baltic-400 transition-smooth"
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {SUBJECT_COLORS.map((c) => {
                        const sel = draftColor === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setDraftColor(c)}
                            aria-label={`Use color ${c}`}
                            aria-pressed={sel}
                            className={cn(
                              "press w-7 h-7 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-lavender-900",
                              sel
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
                    {error && (
                      <p className="text-xs text-red-500 dark:text-red-400">
                        {error}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => commitEdit(s)}
                        disabled={!draftLabel.trim()}
                        className="press px-3 py-1.5 text-xs font-semibold rounded-full bg-baltic-700 dark:bg-baltic-500 text-white hover:bg-baltic-800 dark:hover:bg-baltic-400 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70"
                        style={{
                          transition:
                            "background-color 160ms ease, transform 160ms var(--ease-out)",
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setError("");
                        }}
                        className="press px-3 py-1.5 text-xs font-medium rounded-full text-steel-500 dark:text-steel-400 hover:text-baltic-700 dark:hover:text-baltic-300 hover:bg-lavender-100/60 dark:hover:bg-lavender-800/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70"
                        style={{
                          transition:
                            "color 160ms ease, transform 160ms var(--ease-out)",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="flex-1 min-w-0 truncate text-sm font-medium text-baltic-800 dark:text-baltic-100">
                        {s.label}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-steel-400 tabular-nums flex-shrink-0">
                        {count} {count === 1 ? "task" : "tasks"}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(s)}
                        aria-label={`Rename ${s.label}`}
                        className="press flex-shrink-0 p-1.5 -m-0.5 rounded-md text-steel-400 hover:text-baltic-700 dark:hover:text-baltic-200 hover:bg-lavender-100/70 dark:hover:bg-lavender-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70"
                        style={{
                          transition:
                            "color 160ms ease, background-color 160ms ease, transform 160ms var(--ease-out)",
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(s)}
                        aria-label={
                          isConfirming
                            ? `Confirm delete ${s.label}`
                            : `Delete ${s.label}`
                        }
                        className={cn(
                          "press flex-shrink-0 p-1.5 -m-0.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70",
                          isConfirming
                            ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
                            : "text-steel-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        )}
                        style={{
                          transition:
                            "color 160ms ease, background-color 160ms ease, transform 160ms var(--ease-out)",
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M3 4h8M5.5 4V2.5h3V4M4 4l.5 7.5h5L10 4" />
                        </svg>
                      </button>
                    </div>
                    {isConfirming && (
                      <p className="mt-2 text-[11px] text-red-500 dark:text-red-400">
                        {count > 0
                          ? `${count} ${count === 1 ? "task" : "tasks"} will become unfiled. `
                          : ""}
                        Delete again to confirm.
                      </p>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex justify-end pt-4">
        <Button variant="ghost" type="button" onClick={onClose}>
          Done
        </Button>
      </div>
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
  onUpdate,
  editingTask,
  initialSubject,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, "id" | "createdAt" | "completed">) => void;
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  editingTask?: Task | null;
  initialSubject?: string | null;
}) {
  const { subjects, addSubject } = useSubjects();
  const isEditing = editingTask != null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<string>(
    initialSubject || subjects[0]?.label || ""
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState(todayISO());

  // Inline "new subject" creation, so a task can be filed under a subject
  // that doesn't exist yet without leaving the form.
  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectLabel, setNewSubjectLabel] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState<string>(
    SUBJECT_COLORS[0]
  );
  const [subjectError, setSubjectError] = useState("");

  // Seed the form whenever it opens — from the task when editing, or from
  // defaults when creating. `subjects` is intentionally left out of the deps:
  // re-seeding when the list changes would wipe the user's input the moment
  // they add a subject inline.
  useEffect(() => {
    if (!open) return;
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setSubject(editingTask.subject);
      setPriority(editingTask.priority);
      setDueDate(editingTask.dueDate);
    } else {
      setTitle("");
      setDescription("");
      setSubject(initialSubject || subjects[0]?.label || "");
      setPriority("medium");
      setDueDate(todayISO());
    }
    setAddingSubject(false);
    setNewSubjectLabel("");
    setNewSubjectColor(SUBJECT_COLORS[0]);
    setSubjectError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingTask, initialSubject]);

  const handleAddSubject = useCallback(() => {
    const trimmed = newSubjectLabel.trim();
    if (!trimmed) return;
    if (subjects.some((s) => s.label.toLowerCase() === trimmed.toLowerCase())) {
      setSubjectError("A subject with that name already exists.");
      return;
    }
    addSubject(trimmed, newSubjectColor);
    setSubject(trimmed);
    setAddingSubject(false);
    setNewSubjectLabel("");
    setNewSubjectColor(SUBJECT_COLORS[0]);
    setSubjectError("");
  }, [newSubjectLabel, newSubjectColor, subjects, addSubject]);

  const cancelAddSubject = useCallback(() => {
    setAddingSubject(false);
    setNewSubjectLabel("");
    setSubjectError("");
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !subject) return;
      const payload = {
        title: title.trim(),
        description: description.trim(),
        subject,
        priority,
        dueDate,
      };
      if (editingTask && onUpdate) {
        onUpdate(editingTask.id, payload);
      } else {
        onAdd(payload);
      }
      onClose();
    },
    [
      title,
      description,
      subject,
      priority,
      dueDate,
      editingTask,
      onUpdate,
      onAdd,
      onClose,
    ]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit task" : "New task"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="task-title"
          label="Title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
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

        {/* Subject — chip selector, color-dot per option, with an inline
            "New" chip so a missing subject can be created without leaving
            the form. */}
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

            {/* New-subject toggle — dashed so it reads as "add", not a
                selectable subject. */}
            <button
              type="button"
              onClick={() => {
                setAddingSubject((v) => !v);
                setSubjectError("");
              }}
              aria-expanded={addingSubject}
              className={cn(
                "press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70",
                addingSubject
                  ? "border-baltic-400 dark:border-baltic-500 bg-baltic-50 dark:bg-baltic-900/40 text-baltic-700 dark:text-baltic-200"
                  : "border-lavender-300 dark:border-lavender-700 text-steel-500 dark:text-steel-400 hover:text-baltic-700 dark:hover:text-baltic-300 hover:border-lavender-400 dark:hover:border-lavender-600"
              )}
              style={{
                transition:
                  "background-color 160ms ease, color 160ms ease, transform 160ms var(--ease-out), border-color 160ms ease",
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M6 2v8M2 6h8" />
              </svg>
              New
            </button>
          </div>

          {/* Inline create panel — name + color, mirrors the New-subject
              modal but stays in the task flow. */}
          {addingSubject && (
            <div className="dropdown-enter mt-2 p-3 rounded-xl border border-lavender-200 dark:border-lavender-700 bg-lavender-50/60 dark:bg-lavender-900/40 space-y-3">
              <input
                autoFocus
                value={newSubjectLabel}
                onChange={(e) => {
                  setNewSubjectLabel(e.target.value);
                  if (subjectError) setSubjectError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubject();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelAddSubject();
                  }
                }}
                placeholder="New subject name"
                maxLength={30}
                aria-label="New subject name"
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 dark:border-lavender-700 bg-white dark:bg-lavender-900 text-baltic-800 dark:text-baltic-100 placeholder:text-steel-400 outline-none focus:ring-2 focus:ring-baltic-400/30 focus:border-baltic-400 transition-smooth"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {SUBJECT_COLORS.map((c) => {
                  const isSelected = newSubjectColor === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewSubjectColor(c)}
                      aria-label={`Use color ${c}`}
                      aria-pressed={isSelected}
                      className={cn(
                        "press w-7 h-7 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-lavender-900",
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
              {subjectError && (
                <p className="text-xs text-red-500 dark:text-red-400">
                  {subjectError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddSubject}
                  disabled={!newSubjectLabel.trim()}
                  className="press px-3 py-1.5 text-xs font-semibold rounded-full bg-baltic-700 dark:bg-baltic-500 text-white hover:bg-baltic-800 dark:hover:bg-baltic-400 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70"
                  style={{
                    transition:
                      "background-color 160ms ease, transform 160ms var(--ease-out)",
                  }}
                >
                  Add subject
                </button>
                <button
                  type="button"
                  onClick={cancelAddSubject}
                  className="press px-3 py-1.5 text-xs font-medium rounded-full text-steel-500 dark:text-steel-400 hover:text-baltic-700 dark:hover:text-baltic-300 hover:bg-lavender-100/60 dark:hover:bg-lavender-800/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-baltic-400/70"
                  style={{
                    transition:
                      "color 160ms ease, transform 160ms var(--ease-out)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {subjects.length === 0 && !addingSubject && (
            <p className="text-xs text-steel-400 dark:text-steel-500">
              No subjects yet — add one to file this task.
            </p>
          )}
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
            {(!editingTask || !editingTask.completed) && dueDate < todayISO() && (
              <p className="text-[11px] text-cream-700 dark:text-cream-400">
                In the past — this task will show as overdue.
              </p>
            )}
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
          <Button type="submit" disabled={!title.trim() || !subject}>
            {isEditing ? "Save changes" : "Create task"}
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
  onEdit,
  onToggle,
  onDelete,
}: {
  task: Task;
  subject: UserSubject | undefined;
  onClose: () => void;
  onEdit: () => void;
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

        <div className="space-y-3 pt-4 border-t border-lavender-100 dark:border-lavender-800/60">
          <Button variant="secondary" onClick={onToggle} className="w-full">
            {task.completed ? "Mark pending" : "Mark complete"}
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onEdit} className="flex-1">
              Edit task
            </Button>
            <Button variant="danger" onClick={onDelete} className="flex-1">
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
