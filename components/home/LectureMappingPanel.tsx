import type { LectureItem, TaskItem } from "@/lib/course/types";

interface LectureMappingPanelProps {
  mapping: Array<{ lecture: LectureItem; tasks: TaskItem[] }>;
}

export function LectureMappingPanel({ mapping }: LectureMappingPanelProps) {
  if (mapping.length === 0) {
    return <p className="text-sm text-muted">No lecture mapping available this week.</p>;
  }

  return (
    <div className="space-y-3">
      {mapping.map((entry) => (
        <div key={entry.lecture.id} className="surface-muted rounded-2xl p-4">
          <p className="text-sm font-semibold">{entry.lecture.title}</p>
          <p className="mt-1 text-xs text-muted">{entry.lecture.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.tasks.length === 0 ? (
              <span className="badge">No direct tasks</span>
            ) : (
              entry.tasks.map((task) => (
                <span key={task.id} className="badge">
                  {task.title}
                </span>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
