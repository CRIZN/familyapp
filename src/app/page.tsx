import Link from "next/link";
import { CalendarDays, ShieldCheck, UserRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <AppShell>
      <div className="mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl content-center gap-8 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Slice 1
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            A working shell for one Household.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Set up Parents and Children, manage Child PINs, and enter distinct
            Parent and Child views from the same responsive web app.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className={buttonVariants({ variant: "parent" })} href="/setup">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Start Setup
            </Link>
            <Link className={buttonVariants({ variant: "child" })} href="/child">
              <UserRound aria-hidden="true" className="h-4 w-4" />
              Child View
            </Link>
          </div>
        </section>

        <section className="grid gap-3">
          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <ShieldCheck aria-hidden="true" className="mb-4 h-7 w-7 text-parent" />
            <h2 className="text-xl font-semibold">Parent View</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Equal Parent permissions with Household setup and Child PIN
              management.
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <UserRound aria-hidden="true" className="mb-4 h-7 w-7 text-child" />
            <h2 className="text-xl font-semibold">Child View</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Child profile selection plus PIN entry for a child-scoped session.
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <CalendarDays aria-hidden="true" className="mb-4 h-7 w-7 text-primary" />
            <h2 className="text-xl font-semibold">Next Up</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Chores, submissions, and Overdue behavior attach to this shell in
              Slice 2.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
