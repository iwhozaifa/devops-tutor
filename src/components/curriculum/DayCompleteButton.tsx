"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DayCompleteButtonProps {
  dayId: string;
  isCompleted: boolean;
}

export function DayCompleteButton({
  dayId,
  isCompleted: initialCompleted,
}: DayCompleteButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/progress/day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayId,
          status: completed ? "IN_PROGRESS" : "COMPLETED",
        }),
      });

      if (res.ok) {
        setCompleted(!completed);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (completed) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Day Completed</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClick} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Undo"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Finished with today&apos;s content?
      </p>
      <Button onClick={handleClick} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        )}
        Mark as Complete
      </Button>
    </div>
  );
}
