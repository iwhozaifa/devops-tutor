import Link from "next/link";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { auth } from "@/lib/auth";
import { NavbarMobileMenu } from "./NavbarMobileMenu";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Terminal className="h-5 w-5" />
          DevOps Tutor
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/subjects">Subjects</Link>
          </Button>

          <ThemeToggle />

          {session?.user ? (
            <Button size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <NavbarMobileMenu isLoggedIn={!!session?.user} />
        </div>
      </div>
    </header>
  );
}
