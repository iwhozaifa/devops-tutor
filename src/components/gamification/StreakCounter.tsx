"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCounterProps {
  currentStreak: number;
  className?: string;
}

export function StreakCounter({ currentStreak, className }: StreakCounterProps) {
  const isHot = currentStreak >= 7;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
        isHot
          ? "bg-orange-500/10 text-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
          : "text-muted-foreground",
        className
      )}
    >
      <Flame
        className={cn(
          "h-4 w-4",
          isHot && "animate-pulse text-orange-500"
        )}
      />
      <span className="font-semibold">{currentStreak}</span>
      <span className="text-xs">day streak</span>
    </div>
  );
}
