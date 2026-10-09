import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";

// Admin status lives in the database (User.role), not in an email allowlist:
// emails are not verified at registration, so matching on them would let
// anyone who registers an admin address first become an admin.
// Promote accounts with `npm run admin:promote -- <email>`.
export async function isAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "ADMIN";
}

// Call at the top of every admin page/route — layouts alone are not a
// reliable auth boundary because pages render independently of them.
// Returns the admin as stored in the database (for audit attribution).
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const session = await auth();
  const admin = session?.user?.id
    ? await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, role: true } })
    : null;
  if (admin?.role !== "ADMIN") redirect("/dashboard");
  return { id: admin.id, email: admin.email };
}
