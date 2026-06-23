import Link from "next/link";
import { Home, ShieldCheck, UserRound } from "lucide-react";

export function AppShell({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "parent" | "child";
}) {
  return (
    <main
      className={
        tone === "parent"
          ? "min-h-screen bg-slate-50"
          : tone === "child"
            ? "min-h-screen bg-emerald-50"
            : "min-h-screen bg-background"
      }
    >
      <header className="border-b border-border bg-background/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link className="flex items-center gap-2 font-semibold" href="/">
            <Home aria-hidden="true" className="h-5 w-5" />
            Family App
          </Link>
          <nav className="flex items-center gap-1" aria-label="Primary">
            <Link
              className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-muted"
              href="/parent"
            >
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Parent View
            </Link>
            <Link
              className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-muted"
              href="/child"
            >
              <UserRound aria-hidden="true" className="h-4 w-4" />
              Child View
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}
