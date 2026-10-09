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
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    redirect("/dashboard");
  }
  return session;
}
