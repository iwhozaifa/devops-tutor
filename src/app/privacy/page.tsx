import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { site } from "@/lib/site";

// Operator details come from the runtime environment (src/lib/site.ts)
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        This policy explains what {site.name} stores about you, why, and how you can get a copy of it or have it
        deleted. {site.name} is operated by {site.operator}.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>Your account: name, email address, a hash of your password (never the password itself), and your role.</li>
        <li>If you sign in with GitHub: your GitHub account id, name, email and avatar URL.</li>
        <li>Your learning activity: enrollments, completed days, quiz and exam attempts with answers, task notes, project progress, XP, streaks and badges.</li>
        <li>Security records: rate-limit counters keyed by IP address or email (kept for minutes to an hour), and an audit log of administrator actions.</li>
        <li>Server logs (requests and errors) kept for 30 days for operations and security.</li>
      </ul>

      <h2>Why</h2>
      <p>
        To run your account and track your learning progress (performing our service to you), and to keep the
        service secure (our legitimate interest). We do not sell your data, show ads, or use tracking cookies.
      </p>

      <h2>Cookies</h2>
      <p>
        One essential cookie keeps you signed in. Your theme preference is stored in your browser&apos;s local
        storage. There are no analytics or advertising cookies.
      </p>

      <h2>Who processes it</h2>
      <ul>
        <li>Amazon Web Services hosts the application and database and sends our emails (Amazon SES).</li>
        <li>GitHub, only if you choose to sign in with GitHub.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        On your profile page you can download all data stored about you as a JSON file and permanently delete your
        account. Deleting removes your account and learning data immediately; database backups containing it expire
        within 14 days. For anything else, including corrections, contact{" "}
        <a className="underline" href={`mailto:${site.contactEmail}`}>
          {site.contactEmail}
        </a>
        .
      </p>
    </LegalPage>
  );
}
