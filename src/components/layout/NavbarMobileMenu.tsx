"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarMobileMenuProps {
  isLoggedIn: boolean;
}

export function NavbarMobileMenu({ isLoggedIn }: NavbarMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border bg-background p-2 shadow-lg">
          <Link
            href="/"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Home
          </Link>
          <Link
            href="/subjects"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Subjects
          </Link>
          <div className="my-1 border-t" />
          {isLoggedIn ? (
            <Button size="sm" className="w-full" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                Log in
              </Link>
              <Button size="sm" className="mt-1 w-full" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
