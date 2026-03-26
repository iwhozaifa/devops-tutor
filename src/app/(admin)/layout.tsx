import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Shield,
  Terminal,
} from "lucide-react";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || !isAdmin(session.user.email)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b px-5 font-semibold">
          <Terminal className="h-5 w-5" />
          DevOps Tutor
        </div>

        {/* Admin badge */}
        <div className="px-5 pt-4 pb-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
            <Shield className="h-3.5 w-3.5" />
            Admin Panel
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Back to app */}
        <div className="border-t p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          >
            <BookOpen className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
          <Terminal className="h-5 w-5" />
          <span className="font-semibold">DevOps Tutor</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
            <Shield className="h-3 w-3" />
            Admin
          </span>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b bg-background px-4 py-2 md:hidden">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Back to App
          </Link>
        </nav>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
