"use client";

import { useMemo, useState } from "react";

import { COURSE_SITE_ARCHIVE } from "@/lib/course-site/content";
import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import type { SagOverview, SetupPlatform } from "@/lib/course/types";
import { GIT_BASH_COMMANDS, SAG_SETUP_CHECKS, SAG_SETUP_INSTRUCTIONS } from "@/lib/mock/uiPlaceholders";
import { cn } from "@/lib/utils/cn";

interface SAGPanelProps {
  sag: SagOverview;
}

export function SAGPanel({ sag }: SAGPanelProps) {
  const [platform, setPlatform] = useState<SetupPlatform>("windows");
  const tone = PAGE_TONE_MAP.sag;
  const selectedInstruction = useMemo(
    () => SAG_SETUP_INSTRUCTIONS.find((item) => item.platform === platform) ?? SAG_SETUP_INSTRUCTIONS[0],
    [platform],
  );
  const selectedChecks = useMemo(
    () => SAG_SETUP_CHECKS.filter((item) => item.platform === platform),
    [platform],
  );

  return (
    <div className="space-y-4">
      <section
        className={cn(
          "surface-card module-tone-context module-tone-border p-5",
          getModuleToneClass(tone.summary),
        )}
      >
        <p className="kicker">Staged Auto-Grading</p>
        <h2 className="mt-1 text-xl font-semibold">{sag.title}</h2>
        <p className="mt-2 text-sm text-muted">{sag.summary}</p>
      </section>

      <section className="surface-card module-tone-border p-5">
        <p className="kicker mb-2">Environment</p>
        <div className="flex gap-2">
          {(["windows", "mac"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPlatform(item)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                platform === item ? "bg-[var(--accent)] text-white" : "surface-muted"
              }`}
            >
              {item === "windows" ? "Windows" : "Mac"}
            </button>
          ))}
        </div>
      </section>

      <section
        className={cn(
          "surface-card module-tone-context module-tone-border p-5",
          getModuleToneClass(tone.setup),
        )}
      >
        <h3 className="text-lg font-semibold">Instruction for Setup</h3>
        <ol className="mt-4 space-y-3">
          {selectedInstruction.steps.map((step, index) => (
            <li key={step.title} className="surface-muted rounded-xl p-3">
              <p className="text-sm font-semibold">
                {index + 1}. {step.title}
              </p>
              <p className="mt-1 text-xs text-muted">{step.detail}</p>
              {step.links ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {step.links.map((link) => (
                    <a key={link.href} className="button-ghost px-2.5 py-1.5 text-xs" href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
              {step.commands ? (
                <div className="mt-2 space-y-1">
                  {step.commands.map((command) => (
                    <pre key={command} className="overflow-x-auto rounded-lg bg-[var(--surface)] px-3 py-2 text-xs">
                      <code>{command}</code>
                    </pre>
                  ))}
                </div>
              ) : null}
              {step.note ? <p className="mt-2 text-xs font-semibold text-[var(--accent)]">{step.note}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      <section
        className={cn(
          "surface-card module-tone-context module-tone-border p-5",
          getModuleToneClass(tone.videos),
        )}
      >
        <h3 className="text-lg font-semibold">Setup Checks</h3>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {selectedChecks.map((check) => (
            <a key={check.label} href={check.href} className="surface-card-hover block p-3">
              <p className="text-sm font-semibold">{check.label}</p>
              <p className="mt-1 text-xs text-muted">Use this as a quick final check before running SAG.</p>
            </a>
          ))}
        </div>
      </section>

      <section
        className={cn(
          "surface-card module-tone-context module-tone-border p-5",
          getModuleToneClass(tone.gitbash),
        )}
      >
        <h3 className="text-lg font-semibold">Git Bash Quick Start</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="text-left">
                <th className="border-b border-[var(--border)] px-3 py-2">Command</th>
                <th className="border-b border-[var(--border)] px-3 py-2">Usage</th>
              </tr>
            </thead>
            <tbody>
              {GIT_BASH_COMMANDS.map((item) => (
                <tr key={item.command}>
                  <td className="border-b border-[var(--border)] px-3 py-2 font-mono text-xs">{item.command}</td>
                  <td className="border-b border-[var(--border)] px-3 py-2 text-xs text-muted">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className={cn(
          "surface-card module-tone-context module-tone-border p-5",
          getModuleToneClass(tone.imported),
        )}
      >
        <p className="kicker">Whiteboard Workflow</p>
        <h3 className="mt-1 text-lg font-semibold">SAG to Repo, Report, Lab, and Data</h3>
        <p className="mt-2 text-sm text-muted">{COURSE_SITE_ARCHIVE.whiteboard.summary}</p>
        <ol className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {COURSE_SITE_ARCHIVE.whiteboard.workflow.map((item, index) => (
            <li key={item} className="surface-muted rounded-xl p-3 text-sm">
              <span className="font-semibold">{index + 1}. </span>
              {item}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
