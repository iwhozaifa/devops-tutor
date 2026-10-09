import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { site } from "@/lib/site";

// Operator details come from the runtime environment (src/lib/site.ts)
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <p>
        By creating an account on {site.name} you agree to these terms. {site.name} is operated by {site.operator}.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your password to yourself; you are responsible for activity on your account.</li>
        <li>Use a real email address you control. It is used for account confirmation and password resets.</li>
        <li>You can delete your account at any time from your profile page.</li>
      </ul>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not attempt to access other learners&apos; data or administrative features.</li>
        <li>Do not disrupt the service, for example with automated sign-in attempts or excessive requests.</li>
        <li>Do not manipulate XP, streaks or the leaderboard by automated means.</li>
      </ul>
      <p>We may suspend accounts that break these rules.</p>

      <h2>Content</h2>
      <p>
        The curriculum links to third-party learning resources that remain the property of their authors. Practice
        quizzes and exams are for study only and are not affiliated with any certification body.
      </p>

      <h2>No warranty</h2>
      <p>
        {site.name} is provided as is, without warranty. We are not liable for exam results or for losses arising from
        the use of the service, to the extent the law allows.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms; the date above shows the latest version. Questions:{" "}
        <a className="underline" href={`mailto:${site.contactEmail}`}>
          {site.contactEmail}
        </a>
        . See also the <Link className="underline" href="/privacy">privacy policy</Link>.
      </p>
    </LegalPage>
  );
}
