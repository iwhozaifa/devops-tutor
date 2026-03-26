import Link from "next/link";
import { BookOpen, Award, Terminal, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";

const valueProps = [
  {
    icon: BookOpen,
    title: "Structured Curriculum",
    description:
      "Follow a day-by-day learning path covering all major DevOps domains, from CI/CD to cloud infrastructure.",
  },
  {
    icon: Award,
    title: "Certification Prep",
    description:
      "Practice exams and quizzes aligned with industry certifications like AWS, Kubernetes, and Terraform.",
  },
  {
    icon: Terminal,
    title: "Hands-on Practice",
    description:
      "Daily tasks and projects that reinforce concepts with real-world scenarios and tools.",
  },
  {
    icon: Flame,
    title: "Gamified Progress",
    description:
      "Earn XP, maintain streaks, unlock badges, and track your progress across every subject.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Master DevOps,{" "}
          <span className="text-primary/80">One Day at a Time</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          A structured, gamified curriculum that takes you from fundamentals to
          certification-ready — with curated resources, quizzes, and hands-on
          tasks every single day.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/subjects">Browse Curriculum</Link>
          </Button>
        </div>
      </section>

      {/* Value Props */}
      <section className="border-t bg-muted/40 px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((prop) => (
            <div
              key={prop.title}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <prop.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">{prop.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {prop.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        DevOps Tutor &mdash; Built for engineers who ship.
      </footer>
    </div>
  );
}
