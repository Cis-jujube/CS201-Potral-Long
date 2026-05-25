import { AlertTriangle, LoaderCircle } from "lucide-react";

interface StatePanelProps {
  type: "loading" | "error" | "empty";
  title: string;
  message: string;
}

export function StatePanel({ type, title, message }: StatePanelProps) {
  if (type === "loading") {
    return (
      <div className="surface-card flex items-center gap-3 p-6">
        <LoaderCircle className="size-5 animate-spin text-[var(--accent)]" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-6">
      <div className="flex items-center gap-2">
        {type === "error" ? <AlertTriangle className="size-4 text-[var(--danger)]" /> : null}
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-sm text-muted">{message}</p>
    </div>
  );
}

export function SkeletonBlock({ className = "h-20 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[var(--surface-2)] ${className}`} />;
}
