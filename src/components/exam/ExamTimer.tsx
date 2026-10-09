"use client";

import { useState, useEffect, useEffectEvent } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamTimerProps {
  timeLimitMinutes: number;
  onTimeUp: () => void;
  onTick?: (elapsedSeconds: number) => void;
}

export function ExamTimer({
  timeLimitMinutes,
  onTimeUp,
  onTick,
}: ExamTimerProps) {
  const totalSeconds = timeLimitMinutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [startTime] = useState(() => Date.now());
  const tick = useEffectEvent((elapsed: number, timeUp: boolean) => {
    onTick?.(elapsed);
    if (timeUp) onTimeUp();
  });

  const isWarning = remaining <= 300; // 5 minutes
  const isCritical = remaining <= 60; // 1 minute

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const newRemaining = Math.max(0, totalSeconds - elapsed);
      setRemaining(newRemaining);

      if (newRemaining <= 0) clearInterval(interval);
      tick(elapsed, newRemaining <= 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [totalSeconds, startTime]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-lg font-bold transition-colors",
        isCritical
          ? "animate-pulse border-red-500 bg-red-50 text-red-600"
          : isWarning
          ? "border-red-400 bg-red-50 text-red-500"
          : "border-border bg-card text-foreground"
      )}
    >
      <Clock
        className={cn(
          "h-5 w-5",
          isWarning ? "text-red-500" : "text-muted-foreground"
        )}
      />
      {display}
    </div>
  );
}
