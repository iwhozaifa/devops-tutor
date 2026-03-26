import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { GamificationProvider } from "@/components/gamification/GamificationProvider";
import { getTotalXp, getUserStreak, xpProgress } from "@/lib/gamification";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id!;
  const [totalXp, streak] = await Promise.all([
    getTotalXp(userId),
    getUserStreak(userId),
  ]);

  const progress = xpProgress(totalXp);

  const sidebarProps = {
    userName: session.user.name,
    userEmail: session.user.email,
    xp: { ...progress, totalXp },
    streak: streak?.currentStreak ?? 0,
  };

  return (
    <GamificationProvider>
      <div className="flex h-full min-h-screen flex-col md:flex-row">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar {...sidebarProps} />
        </div>

        {/* Mobile nav */}
        <MobileNav {...sidebarProps} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </GamificationProvider>
  );
}
