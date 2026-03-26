"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  User,
  LogOut,
  Terminal,
  Trophy,
  Menu,
  X,
} from "lucide-react";
import { XpBar } from "@/components/gamification/XpBar";
import { StreakCounter } from "@/components/gamification/StreakCounter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { logoutUser } from "@/lib/auth-actions";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/subjects", label: "Subjects", icon: BookOpen },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

interface MobileNavProps {
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  xp?: {
    level: number;
    current: number;
    required: number;
    percentage: number;
    totalXp: number;
  };
  streak?: number;
}

export function MobileNav({ userName, userEmail, xp, streak }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleOverlayClick = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <div className="md:hidden">
      {/* Top bar */}
      <div className="flex h-14 items-center justify-between border-b bg-background px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Terminal className="h-5 w-5" />
          DevOps Tutor
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={handleOverlayClick}
        >
          {/* Drawer */}
          <aside
            className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar text-sidebar-foreground shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b px-5">
              <span className="flex items-center gap-2 font-semibold">
                <Terminal className="h-5 w-5" />
                DevOps Tutor
              </span>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar-accent/50"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-3">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Gamification */}
            {xp && (
              <div className="border-t px-4 py-3 space-y-2">
                <XpBar
                  level={xp.level}
                  current={xp.current}
                  required={xp.required}
                  percentage={xp.percentage}
                  totalXp={xp.totalXp}
                />
                {streak !== undefined && (
                  <StreakCounter currentStreak={streak} />
                )}
              </div>
            )}

            {/* User info + logout */}
            <div className="border-t p-3">
              <div className="mb-2 flex items-center justify-between px-3">
                <span className="text-xs text-sidebar-foreground/60">
                  Theme
                </span>
                <ThemeToggle />
              </div>
              <div className="mb-2 px-3">
                <p className="truncate text-sm font-medium">
                  {userName ?? "User"}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {userEmail}
                </p>
              </div>
              <form action={logoutUser}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-3 text-sidebar-foreground/70"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </Button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
