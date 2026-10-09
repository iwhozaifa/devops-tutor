"use client";

import { useSearchParams } from "next/navigation";

export function ResetNotice() {
  if (useSearchParams().get("reset") !== "1") return null;
  return (
    <div className="rounded-lg border border-green-600/40 bg-green-600/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
      Password updated. Sign in with your new password.
    </div>
  );
}
