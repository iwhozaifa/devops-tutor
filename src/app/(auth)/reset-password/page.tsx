import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { peekEmailToken } from "@/lib/tokens";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

const PROBLEMS = {
  invalid: "This reset link is not valid. Check that you opened the whole link from the email.",
  expired: "This reset link has expired. Links work for 1 hour.",
  used: "This reset link has already been used.",
} as const;

interface Props {
  searchParams: Promise<{ token?: string }>;
}

// Only checks the link; it is used up when the form is submitted, so email
// scanners that open it do not break it.
export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const checked = token ? await peekEmailToken(token, "RESET_PASSWORD") : ({ ok: false, reason: "invalid" } as const);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">Choose a new password</h1>
      </div>

      {checked.ok && token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{PROBLEMS[checked.ok ? "invalid" : checked.reason]}</p>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Request a new link
          </Link>
        </div>
      )}
    </div>
  );
}
