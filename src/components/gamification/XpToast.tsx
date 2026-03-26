"use client";

import { Zap, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface XpToastProps {
  amount: number;
  badges?: { title: string; icon: string }[];
  visible: boolean;
}

export function XpToast({ amount, badges, visible }: XpToastProps) {
  return (
    <div
      className={cn(
        "fixed right-4 top-4 z-[100] flex flex-col gap-2 transition-all duration-300",
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-4 opacity-0 pointer-events-none"
      )}
    >
      {/* XP notification */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 shadow-lg animate-in slide-in-from-top-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20">
          <Zap className="h-4 w-4 text-yellow-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-yellow-500">+{amount} XP</p>
          <p className="text-[10px] text-muted-foreground">Experience gained</p>
        </div>
      </div>

      {/* Badge notifications */}
      {badges?.map((badge, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 shadow-lg animate-in slide-in-from-top-2"
          style={{ animationDelay: `${(i + 1) * 150}ms` }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
            <Award className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-purple-500">Badge Unlocked!</p>
            <p className="text-[10px] text-muted-foreground">{badge.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
