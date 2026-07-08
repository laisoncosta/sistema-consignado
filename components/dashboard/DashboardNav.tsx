"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/lib/rbac";

type DashboardNavProps = {
  items: NavItem[];
  primary: string;
  primaryLight: string;
};

export function DashboardNav({ items, primary, primaryLight }: DashboardNavProps) {
  const pathname = usePathname();

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className="border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80"
      style={{ borderColor: primaryLight }}
      aria-label="Menu principal"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-6 py-3">
        {items.map((item) => {
          const ativo =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition dark:text-slate-400 ${
                ativo ? "" : "dark:hover:bg-slate-800"
              }`}
              style={
                ativo
                  ? { backgroundColor: primary, color: "#fff" }
                  : { color: "#475569", backgroundColor: "transparent" }
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
