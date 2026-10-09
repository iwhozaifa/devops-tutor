import Link from "next/link";
import { site } from "@/lib/site";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← {site.name}
      </Link>
      <h1 className="mt-6 text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated {site.legalUpdated}</p>
      <div className="mt-8 space-y-6 text-sm leading-6 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </main>
  );
}
