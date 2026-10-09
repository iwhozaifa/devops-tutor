import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { consumeEmailToken } from "@/lib/tokens";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Confirm email", robots: { index: false } };

const FAILURES = {
  invalid: "This confirmation link is not valid. Check that you opened the whole link from the email.",
  expired: "This confirmation link has expired. Sign in and use “Resend email” to get a new one.",
  used: "This confirmation link has already been used. If your email is not confirmed yet, sign in and resend the email.",
} as const;

interface Props {
  searchParams: Promise<{ token?: string }>;
}

// Opening the link is the confirmation: an email scanner that follows it
// first still proves the address receives mail.
export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const result = token ? await consumeEmailToken(token, "VERIFY_EMAIL") : ({ ok: false, reason: "invalid" } as const);

  if (result.ok) {
    await db.user.updateMany({
      where: { id: result.userId, emailVerified: null },
      data: { emailVerified: new Date() },
    });
  }

  return (
    <div className="space-y-5 text-center">
      {result.ok ? (
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
      ) : (
        <XCircle className="mx-auto h-10 w-10 text-destructive" />
      )}
      <h1 className="text-2xl font-bold">{result.ok ? "Email confirmed" : "Link not usable"}</h1>
      <p className="text-sm text-muted-foreground">
        {result.ok ? "Thanks, your email address is confirmed." : FAILURES[result.reason]}
      </p>
      <Button asChild className="w-full">
        <Link href="/dashboard">Continue to your dashboard</Link>
      </Button>
    </div>
  );
}
