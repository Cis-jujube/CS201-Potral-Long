"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpenCheck,
  CircleHelp,
  FileCheck2,
  FolderKanban,
  GraduationCap,
  Home,
  Library,
  ListChecks,
  LogOut,
  Menu,
  PanelTopClose,
  PanelTopOpen,
  ShieldCheck,
  X,
} from "lucide-react";

import { ThemeStyleSwitcher } from "@/components/ui/ThemeStyleSwitcher";
import { COURSE_WEEKS } from "@/lib/course/types";
import { getDailyQuote } from "@/lib/mock/dailyQuotes";
import { cn } from "@/lib/utils/cn";
import { useCourseUi } from "@/providers/CourseUiProvider";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/sag", label: "SAG", icon: FileCheck2 },
  { href: "/homework", label: "Homework", icon: ListChecks },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/resources", label: "Resources", icon: Library },
  { href: "/exams", label: "Exams", icon: GraduationCap },
  { href: "/faq", label: "FAQ", icon: CircleHelp },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export function Navbar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTop, setDrawerTop] = useState(138);
  const headerRef = useRef<HTMLElement | null>(null);
  const { selectedWeek, setSelectedWeek, weekNavCollapsed, setWeekNavCollapsed } = useCourseUi();
  const dailyQuote = getDailyQuote();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  };

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const updateDrawerTop = () => {
      if (!headerRef.current) {
        return;
      }

      const headerBottom = headerRef.current.getBoundingClientRect().bottom;
      setDrawerTop(Math.ceil(headerBottom + 8));
    };

    updateDrawerTop();
    const raf = window.requestAnimationFrame(updateDrawerTop);
    window.addEventListener("resize", updateDrawerTop);
    window.addEventListener("scroll", updateDrawerTop, { passive: true });

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateDrawerTop);
      window.removeEventListener("scroll", updateDrawerTop);
    };
  }, [drawerOpen]);

  if (pathname === "/login") {
    return null;
  }

  return (
    <>
      <header
        ref={headerRef}
        className="panel panel-gradient-soft sticky top-3 z-40 mx-3 mt-3 px-3 py-3 sm:mx-6 sm:px-4 lg:mx-8 lg:px-5"
      >
        <div className="flex flex-col gap-3">
          {weekNavCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <BookOpenCheck className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="kicker whitespace-nowrap leading-none">CS201</p>
                  <h1 className="mt-1 truncate text-base font-semibold leading-tight">Week {selectedWeek}</h1>
                </div>
              </div>

              <button
                type="button"
                className="button-ghost p-2"
                onClick={() => setWeekNavCollapsed(false)}
                aria-expanded={false}
                aria-label="Expand week navigation"
              >
                <PanelTopOpen className="size-4" />
              </button>

              <button type="button" className="button-ghost p-2" onClick={handleLogout} aria-label="Logout">
                <LogOut className="size-4" />
              </button>

              <button
                type="button"
                className="button-ghost p-2"
                onClick={() => setDrawerOpen((value) => !value)}
                aria-expanded={drawerOpen}
                aria-label="Toggle menu"
              >
                {drawerOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>
            </div>
          ) : (
            <>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex shrink-0 items-center gap-2 rounded-xl p-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <BookOpenCheck className="size-4" />
              </div>
              <div>
                <p className="kicker whitespace-nowrap leading-none">CS201</p>
                <h1 className="mt-1 whitespace-nowrap text-base font-semibold leading-tight">Week Navigation</h1>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 xl:justify-center">
              {COURSE_WEEKS.map((week) => (
                <button
                  key={week}
                  type="button"
                  onClick={() => setSelectedWeek(week)}
                  className={cn(
                    "min-w-14 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                    selectedWeek === week
                      ? "bg-[var(--accent)] text-white"
                      : "surface-muted text-[var(--text)] hover:bg-[var(--surface)]",
                  )}
                  aria-pressed={selectedWeek === week}
                  aria-label={`Select week ${week}`}
                >
                  Week {week}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <nav
              className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto min-[1800px]:flex"
              aria-label="Primary navigation"
            >
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-[var(--accent)] text-white"
                        : "text-muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <DailyQuotePill quote={dailyQuote} />

            <div className="hidden shrink-0 min-[1800px]:block">
              <ThemeStyleSwitcher />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="button-ghost p-2"
                onClick={() => setWeekNavCollapsed(true)}
                aria-expanded={true}
                aria-label="Collapse week navigation"
              >
                <PanelTopClose className="size-4" />
              </button>

              <button type="button" className="button-ghost p-2" onClick={handleLogout} aria-label="Logout">
                <LogOut className="size-4" />
              </button>

              <button
                type="button"
                className="button-ghost p-2 min-[1800px]:hidden"
                onClick={() => setDrawerOpen((value) => !value)}
                aria-expanded={drawerOpen}
                aria-label="Toggle menu"
              >
                {drawerOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>
            </div>
          </div>
            </>
          )}
        </div>
      </header>

      {drawerOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/35 backdrop-blur-sm min-[1800px]:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            className="panel absolute left-3 right-3 max-w-[380px] overflow-x-hidden overflow-y-auto p-4 sm:left-auto sm:w-[min(88vw,380px)]"
            style={{ top: drawerTop, maxHeight: `calc(100vh - ${drawerTop + 12}px)` }}
            onClick={(event) => event.stopPropagation()}
          >
            <nav className="min-w-0" aria-label="Mobile navigation">
              <ul className="grid grid-cols-1 gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setDrawerOpen(false)}
                        className={cn(
                          "flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                          active
                            ? "bg-[var(--accent)] text-white"
                            : "surface-muted text-[var(--text)] hover:scale-[1.02]",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="min-w-0 truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="mt-4 min-w-0 overflow-hidden">
              <ThemeStyleSwitcher />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function DailyQuotePill({ quote }: { quote: { text: string } }) {
  return (
    <div className="surface-muted flex min-h-10 min-w-0 flex-1 items-center rounded-xl px-3 py-2 min-[1800px]:max-w-sm">
      <p className="truncate text-sm font-medium leading-tight text-[var(--text)]">{quote.text}</p>
    </div>
  );
}
