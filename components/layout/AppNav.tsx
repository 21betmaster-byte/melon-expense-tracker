"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  BarChart2,
  Settings,
  LogOut,
  Plus,
} from "lucide-react";
import { GroupSwitcher } from "./GroupSwitcher";
import { logOut } from "@/lib/firebase/auth";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const { reset } = useAppStore();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [fullFormOpen, setFullFormOpen] = useState(false);

  const handleLogout = async () => {
    await logOut();
    reset();
    router.push("/login");
  };

  return (
    <>
      {/* Top Nav Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-400 text-lg">Melon</span>
          <GroupSwitcher />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowLogoutDialog(true)}
          className="text-slate-400 hover:text-slate-100"
          aria-label="Log out"
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4" />
        </Button>
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

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent data-testid="logout-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="logout-cancel-btn">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              data-testid="logout-confirm-btn"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
