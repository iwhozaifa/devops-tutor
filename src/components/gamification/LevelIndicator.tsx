"use client";

import { cn } from "@/lib/utils";

interface LevelIndicatorProps {
  level: number;
  percentage: number;
  size?: number;
  className?: string;
}

export function LevelIndicator({
  level,
  percentage,
  size = 48,
  className,
}: LevelIndicatorProps) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-yellow-500 transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-bold">{level}</span>
    </div>
  );
}
