"use client";

import { useMemo, useState } from "react";

import { TaskCard } from "@/components/ui/TaskCard";
import type { TaskItem } from "@/lib/course/types";

type TaskFilter = "all" | TaskItem["type"];

const filterOptions: Array<{ key: TaskFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "homework", label: "Homework" },
  { key: "quiz", label: "Quizzes" },
  { key: "ai-reflection", label: "AI Reflections" },
  { key: "bk-reflection", label: "BK Reflections" },
];

interface HomeworkBoardProps {
  tasks: TaskItem[];
  completedTaskIds: string[];
  onToggleCompleted: (taskId: string) => void;
  className?: string;
}

export function HomeworkBoard({ tasks, completedTaskIds, onToggleCompleted, className }: HomeworkBoardProps) {
  const [filter, setFilter] = useState<TaskFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") {
      return tasks;
    }

    return tasks.filter((task) => task.type === filter);
  }, [tasks, filter]);

  return (
    <div className={className ?? "space-y-4"}>
      <div className="surface-card p-4">
        <p className="kicker mb-2">Filter tasks</p>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                filter === option.key ? "bg-[var(--accent)] text-white" : "surface-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {filtered.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            completed={completedTaskIds.includes(task.id)}
            onToggle={onToggleCompleted}
          />
        ))}
      </div>
    </div>
  );
}
