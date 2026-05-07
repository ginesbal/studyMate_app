"use client";

import { useState } from "react";
import { usePreferences } from "@/lib/contexts";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const { name, dailyGoal, focusBlockMin, setName, setDailyGoal, setFocusBlockMin } =
    usePreferences();
  const [localName, setLocalName] = useState(name);
  const [localGoal, setLocalGoal] = useState(String(dailyGoal));
  const [localBlock, setLocalBlock] = useState(String(focusBlockMin));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!localName.trim()) {
      setFeedback({ type: "error", message: "Name cannot be empty" });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    const goalNum = parseInt(localGoal, 10);
    if (!goalNum || goalNum < 1) {
      setFeedback({ type: "error", message: "Goal must be at least 1 minute" });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    const blockNum = parseInt(localBlock, 10);
    if (!blockNum || blockNum < 1 || blockNum > 180) {
      setFeedback({
        type: "error",
        message: "Focus block must be between 1 and 180 minutes",
      });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    setName(localName.trim());
    setDailyGoal(goalNum);
    setFocusBlockMin(blockNum);
    setFeedback({ type: "success", message: "Saved" });
    setTimeout(() => setFeedback(null), 2000);
  }

  return (
    <div className="relative space-y-6 max-w-2xl mx-auto">
      {/* Decorative blob */}
      <div className="absolute -top-8 -right-20 w-36 h-36 blob-2 bg-ash-200/20 dark:bg-ash-700/10 float-slow pointer-events-none" />

      <div>
        <h1 className="text-display text-baltic-800 dark:text-baltic-100">Settings</h1>
        <p className="text-sm text-steel-400 mt-1">Manage your preferences</p>
      </div>

      {/* Profile */}
      <Card padding="lg">
        <h2 className="text-title text-baltic-800 dark:text-baltic-100 mb-4">Profile</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <Input
            id="settings-name"
            label="Name"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
          />
          <Input
            id="settings-goal"
            label="Daily focus goal (minutes)"
            type="number"
            min="1"
            value={localGoal}
            onChange={(e) => setLocalGoal(e.target.value)}
          />
          <Input
            id="settings-block"
            label="Focus block length (minutes)"
            type="number"
            min="1"
            max="180"
            value={localBlock}
            onChange={(e) => setLocalBlock(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm">Save</Button>
            {feedback && (
              <span className={`text-xs font-medium ${feedback.type === "error" ? "text-red-500" : "text-ash-600"}`}>
                {feedback.message}
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* Data */}
      <Card padding="lg">
        <h2 className="text-title text-baltic-800 dark:text-baltic-100 mb-4">Data</h2>
        <p className="text-sm text-steel-400 mb-3">
          All data is stored locally in your browser.
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (confirm("This will clear all your data. Are you sure?")) {
              localStorage.removeItem("aim_tasks");
              localStorage.removeItem("aim_sessions");
              localStorage.removeItem("aim_name");
              localStorage.removeItem("aim_daily_goal");
              localStorage.removeItem("aim_focus_block_min");
              window.location.reload();
            }
          }}
        >
          Clear all data
        </Button>
      </Card>
    </div>
  );
}
