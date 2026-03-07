"use client";
import { useState } from "react";
import Link from "next/link";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  BarChart2,
  Settings,
  Plus,
} from "lucide-react";
import { GroupSwitcher } from "./GroupSwitcher";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import { QuickAddDialog } from "@/components/expenses/QuickAddDialog";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";

const NAV_LEFT = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
];

const NAV_RIGHT = [
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const AppNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAppStore();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [fullFormOpen, setFullFormOpen] = useState(false);

  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <>
      {/* Top Nav Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-400 text-lg">Melon</span>
          <GroupSwitcher />
        </div>
        <button
          onClick={() => router.push("/profile")}
          className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
          aria-label="Profile"
          data-testid="profile-avatar-btn"
        >
          {initial}
        </button>
      </header>

      {/* Bottom Tab Bar (mobile-first) with center FAB */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-800 flex items-end" data-testid="bottom-nav">
        {NAV_LEFT.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2 gap-1 text-xs transition-colors ${
                active
                  ? "text-blue-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Center FAB */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setQuickAddOpen(true)}
            className="relative -top-4 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center transition-colors"
            aria-label="Quick add expense"
            data-testid="quick-add-fab"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>

        {NAV_RIGHT.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2 gap-1 text-xs transition-colors ${
                active
                  ? "text-blue-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Add Dialog */}
      <QuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onExpandToFullForm={() => setFullFormOpen(true)}
      />

      {/* Full Form Dialog (triggered from Quick Add → "Full form") */}
      <AddExpenseDialog
        open={fullFormOpen}
        onOpenChange={setFullFormOpen}
      />

    </>
  );
};
