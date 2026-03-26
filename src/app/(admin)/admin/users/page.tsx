import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const query = params.q ?? "";

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: { enrollments: true },
        },
        streak: {
          select: { currentStreak: true },
        },
        xpLedger: {
          select: { amount: true },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildUrl(p: number, q: string) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="mt-1 text-muted-foreground">
          {total} total user{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search */}
      <form className="flex gap-2" action="/admin/users" method="GET">
        <input
          name="q"
          type="text"
          placeholder="Search by name or email..."
          defaultValue={query}
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" size="sm">
          Search
        </Button>
        {query && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/users">Clear</Link>
          </Button>
        )}
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">
                Joined
              </th>
              <th className="px-4 py-3 text-right font-medium">Enrollments</th>
              <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                Total XP
              </th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell">
                Streak
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const totalXp = user.xpLedger.reduce(
                (sum, x) => sum + x.amount,
                0
              );
              return (
                <tr
                  key={user.id}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">
                    {user.name ?? "Unnamed"}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {user.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user._count.enrollments}
                  </td>
                  <td className="hidden px-4 py-3 text-right sm:table-cell">
                    {totalXp.toLocaleString()}
                  </td>
                  <td className="hidden px-4 py-3 text-right md:table-cell">
                    {user.streak?.currentStreak ?? 0}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildUrl(page - 1, query)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildUrl(page + 1, query)}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
