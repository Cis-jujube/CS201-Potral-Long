"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams.get("next") || "/";
  const safeNextPath = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
  const teacherLoginHref = `/api/auth/teacher/start?next=${encodeURIComponent(safeNextPath)}`;
  const ssoError = searchParams.get("ssoError");
  const showLocalLogin = searchParams.get("local") === "1" || Boolean(ssoError);
  const localLoginHref = `/login?local=1&next=${encodeURIComponent(safeNextPath)}`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Invalid username or password.");
      return;
    }

    router.replace(safeNextPath);
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-4 py-10">
      <section className="surface-card module-tone-context module-tone-border module-tone-blue w-full max-w-md p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <LockKeyhole className="size-5" />
          </span>
          <div>
            <p className="kicker">CS201 Portal</p>
            <h1 className="mt-1 text-2xl font-semibold">Login</h1>
          </div>
        </div>

        <div className="space-y-4">
          <a className="button-ghost w-full" href={teacherLoginHref}>
            Login with Repolab
          </a>

          {ssoError ? (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-[var(--warning)]">
              Repolab login is unavailable. Use local portal login or try again later.
            </p>
          ) : null}

          {showLocalLogin ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-[var(--border)]" />
                <span>local portal login</span>
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>

              <label className="block">
                <span className="text-sm font-semibold">Username</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Password</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
                  autoComplete="current-password"
                  required
                />
              </label>

              {error ? <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}

              <button type="submit" className="button-solid w-full" disabled={submitting}>
                {submitting ? "Signing in..." : "Login"}
              </button>
            </form>
          ) : (
            <a className="block text-center text-sm font-semibold text-[var(--accent)]" href={localLoginHref}>
              Use local portal login
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
