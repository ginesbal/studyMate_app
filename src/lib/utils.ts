export function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatTime(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getDayProgress() {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  return Math.min(hours / 16, 1); // 16 waking hours
}

export function getWeekday() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

export function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function isOverdue(dateStr: string) {
  const due = new Date(dateStr);
  due.setHours(23, 59, 59);
  return due < new Date();
}

/**
 * Clock-face label for "you'd hit your goal by X" — given how many minutes
 * of focus the user still owes, returns the time of day they'd finish if
 * they started right now. Returns null when there's nothing left to do.
 */
export function projectedFinishTime(minutesRemaining: number): string | null {
  if (minutesRemaining <= 0) return null;
  const finish = new Date(Date.now() + minutesRemaining * 60_000);
  return finish.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * "Today" / "Tomorrow" / weekday name for dates within the next 6 days,
 * "Mon, May 12" otherwise. Used to group upcoming tasks by day.
 */
export function dayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7)
    return date.toLocaleDateString("en-US", { weekday: "long" });
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function groupByDate(
  tasks: { dueDate: string }[]
): Record<string, typeof tasks> {
  const groups: Record<string, typeof tasks> = {};
  for (const task of tasks) {
    const key = formatDate(task.dueDate);
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  }
  return groups;
}
