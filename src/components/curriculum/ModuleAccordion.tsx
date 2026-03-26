"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayInfo {
  dayNumber: number;
  title: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
}

interface ModuleAccordionProps {
  title: string;
  weekStart: number;
  weekEnd: number;
  days: DayInfo[];
  subjectSlug: string;
}

const statusIcon: Record<DayInfo["status"], typeof CheckCircle2> = {
  COMPLETED: CheckCircle2,
  IN_PROGRESS: Loader2,
  NOT_STARTED: Circle,
};

const statusColor: Record<DayInfo["status"], string> = {
  COMPLETED: "text-green-500",
  IN_PROGRESS: "text-blue-500",
  NOT_STARTED: "text-muted-foreground/40",
};

export function ModuleAccordion({
  title,
  weekStart,
  weekEnd,
  days,
  subjectSlug,
}: ModuleAccordionProps) {
  const [open, setOpen] = useState(false);
  const completedCount = days.filter((d) => d.status === "COMPLETED").length;

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Weeks {weekStart}–{weekEnd} · {days.length} days ·{" "}
            {completedCount} completed
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-2">
          <div className="space-y-1">
            {days.map((day) => {
              const Icon = statusIcon[day.status];
              return (
                <Link
                  key={day.dayNumber}
                  href={`/subjects/${subjectSlug}/curriculum/${day.dayNumber}`}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <Icon
                    className={cn("h-4 w-4 shrink-0", statusColor[day.status])}
                  />
                  <span className="text-muted-foreground">
                    Day {day.dayNumber}
                  </span>
                  <span className="truncate">{day.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
