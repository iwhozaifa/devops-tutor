import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { listAuditLog } from "@/lib/audit";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Audit log · Admin" };

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  ROLE_GRANTED: "Admin role granted",
  ROLE_REVOKED: "Admin role revoked",
  USER_LIST_VIEWED: "User list viewed",
};

function describe(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "";
  return Object.entries(metadata as Record<string, unknown>)
    .filter(([, v]) => v !== "" && v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(", ");
}

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminAuditPage({ searchParams }: Props) {
  await requireAdmin();

  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const { entries, total } = await listAuditLog({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Role changes and views of learner data, newest first. {total} entries.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">When (UTC)</th>
              <th className="px-4 py-2 font-medium">Action</th>
              <th className="px-4 py-2 font-medium">By</th>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">
                  {e.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="px-4 py-2">{ACTION_LABELS[e.action] ?? e.action}</td>
                <td className="px-4 py-2">{e.actorLabel}</td>
                <td className="px-4 py-2">{e.targetLabel ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{describe(e.metadata)}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" asChild disabled={page <= 1}>
            <Link href={`/admin/audit?page=${Math.max(1, page - 1)}`}>
              <ChevronLeft /> Newer
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
            <Link href={`/admin/audit?page=${Math.min(totalPages, page + 1)}`}>
              Older <ChevronRight />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
