"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const startTimeRef = useRef(Date.now());
  const onTimeUpRef = useRef(onTimeUp);
  const onTickRef = useRef(onTick);

  onTimeUpRef.current = onTimeUp;
  onTickRef.current = onTick;

  const isWarning = remaining <= 300; // 5 minutes
  const isCritical = remaining <= 60; // 1 minute

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const newRemaining = Math.max(0, totalSeconds - elapsed);
      setRemaining(newRemaining);
      onTickRef.current?.(elapsed);

      if (newRemaining <= 0) {
        clearInterval(interval);
        onTimeUpRef.current();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [totalSeconds]);

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
