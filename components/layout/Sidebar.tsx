"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, FileCheck2, FolderKanban, GraduationCap, Home, Library, ListChecks } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/sag", label: "SAG", icon: FileCheck2 },
  { href: "/homework", label: "Homework", icon: ListChecks },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/resources", label: "Resources", icon: Library },
  { href: "/exams", label: "Exams", icon: GraduationCap },
  { href: "/faq", label: "FAQ", icon: CircleHelp },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="panel h-fit p-3">
      <nav aria-label="Main navigation">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "surface-muted text-[var(--text)] hover:scale-[1.02]",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
