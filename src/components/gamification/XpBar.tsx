"use client";

import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface XpBarProps {
  level: number;
  current: number;
  required: number;
  percentage: number;
  totalXp: number;
  className?: string;
}

export function XpBar({
  level,
  current,
  required,
  percentage,
  totalXp,
  className,
}: XpBarProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-semibold">
          <Zap className="h-3 w-3 text-yellow-500" />
          Level {level}
        </span>
        <span className="text-muted-foreground">
          {totalXp.toLocaleString()} XP
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {current} / {required} XP to next level
      </p>
    </div>
  );
}
