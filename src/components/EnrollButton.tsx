"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnrollButtonProps {
  subjectId: string;
  subjectSlug: string;
  /** Re-render the current page instead of going to the subject overview */
  stayOnPage?: boolean;
}

export function EnrollButton({ subjectId, subjectSlug, stayOnPage = false }: EnrollButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleEnroll() {
    setLoading(true);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });

      if (res.ok) {
        if (!stayOnPage) router.push(`/subjects/${subjectSlug}`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" onClick={handleEnroll} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Enroll
    </Button>
  );
}
