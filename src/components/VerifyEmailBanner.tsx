"use client";

import { useState, useTransition } from "react";
import { MailWarning } from "lucide-react";
import { resendVerificationEmail } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";

export function VerifyEmailBanner({ email }: { email: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <MailWarning className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium">Confirm your email address</p>
          <p>We sent a link to {email}. Confirming lets you recover your account if you forget your password.</p>
          {message && <p className="mt-1 font-medium">{message}</p>}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await resendVerificationEmail();
            setMessage("error" in result ? result.error : "Sent. Check your inbox.");
          })
        }
      >
        Resend email
      </Button>
    </div>
  );
}
