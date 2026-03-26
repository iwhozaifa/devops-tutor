import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
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

  return (
    <GamificationProvider>
      <div className="flex h-full min-h-screen">
        <Sidebar
          userName={session.user.name}
          userEmail={session.user.email}
          xp={{ ...progress, totalXp }}
          streak={streak?.currentStreak ?? 0}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
        </main>
      </div>
    </GamificationProvider>
  );
}
