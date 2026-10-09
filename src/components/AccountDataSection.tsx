"use client";

import { useActionState } from "react";
import { Download, Trash2 } from "lucide-react";
import { deleteAccount } from "@/lib/account-actions";
import { Button } from "@/components/ui/button";

export function AccountDataSection({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string } | void, formData: FormData) => deleteAccount(formData),
    undefined
  );

  return (
    <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Your data</h2>
        <p className="text-sm text-muted-foreground">
          Download a copy of everything stored about you, or delete your account. See the{" "}
          <a href="/privacy" className="underline">
            privacy policy
          </a>
          .
        </p>
      </div>

      <Button variant="outline" size="sm" asChild>
        {/* A plain link: the browser saves the JSON attachment */}
        <a href="/api/account/export" download>
          <Download /> Download my data
        </a>
      </Button>

      <form action={formAction} className="space-y-3 border-t pt-4">
        <p className="text-sm">
          <span className="font-medium text-destructive">Delete account.</span> This permanently removes
          your progress, XP, badges and attempts. It cannot be undone.
        </p>
        {state?.error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {state.error}
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm font-medium">
            {hasPassword ? "Confirm with your password" : "Type your email address to confirm"}
          </label>
          <input
            id="confirm"
            name="confirm"
            type={hasPassword ? "password" : "email"}
            required
            autoComplete={hasPassword ? "current-password" : "off"}
            className="flex h-9 w-full max-w-sm rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" variant="destructive" size="sm" disabled={pending}>
          <Trash2 /> {pending ? "Deleting..." : "Delete my account"}
        </Button>
      </form>
    </section>
  );
}
