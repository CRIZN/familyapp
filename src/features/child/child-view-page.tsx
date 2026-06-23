"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  Clock3,
  ListChecks,
  KeyRound,
  LogOut,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";

import type { ChoreOccurrence } from "@/domain/chores";
import {
  getChildChoreBoard,
  getChildPointLedger,
  getChildWins,
  submitChore,
} from "@/domain/chores";
import { getChildView, startChildSession } from "@/domain/household";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearChildSession,
  getChildSessionSnapshot,
  getHouseholdSnapshot,
  getHydratedSnapshot,
  getServerHydratedSnapshot,
  getServerSnapshot,
  saveHousehold,
  saveChildSession,
  subscribeChildSession,
  subscribeHousehold,
  subscribeHydration,
} from "@/features/household/local-household-store";

export function ChildViewPage() {
  const hasLoaded = useSyncExternalStore(
    subscribeHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const household = useSyncExternalStore(
    subscribeHousehold,
    getHouseholdSnapshot,
    getServerSnapshot,
  );
  const session = useSyncExternalStore(
    subscribeChildSession,
    getChildSessionSnapshot,
    getServerSnapshot,
  );
  const [selectedChildId, setSelectedChildId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!hasLoaded) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-md border border-border bg-background p-6 shadow-panel">
          <p className="text-sm text-muted-foreground">Loading Child View...</p>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-md border border-border bg-background p-6 shadow-panel">
          <UserRound aria-hidden="true" className="mb-4 h-9 w-9 text-child" />
          <h1 className="text-2xl font-semibold">Child View</h1>
          <p className="mt-2 text-muted-foreground">
            A Parent needs to create the Household before Children can enter.
          </p>
          <Link
            className={buttonVariants({ className: "mt-5", variant: "parent" })}
            href="/setup"
          >
            Start Household Setup
          </Link>
        </div>
      </div>
    );
  }

  if (session) {
    const view = getChildView(household, session.childId);
    const choreBoard = getChildChoreBoard(
      household,
      session.childId,
      getTodayDateKey(),
    );
    const pointLedger = getChildPointLedger(household, session.childId);
    const wins = getChildWins(household, session.childId);
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-child">
              Child View
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              Hi, {view.child.name}
            </h1>
            <p className="mt-2 text-muted-foreground">{view.householdName}</p>
          </div>
          <Button type="button" variant="outline" onClick={leaveChildView}>
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Leave Child View
          </Button>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <Sparkles aria-hidden="true" className="mb-4 h-7 w-7 text-child" />
            <p className="text-sm font-medium text-muted-foreground">
              Point Balance
            </p>
            <p className="mt-2 text-4xl font-semibold">
              {view.child.pointBalance}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-5 shadow-panel sm:col-span-2">
            <h2 className="text-lg font-semibold">Today</h2>
            {choreBoard.today.length === 0 && choreBoard.overdue.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No Chores due right now.
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              {choreBoard.overdue.map((chore) => (
                <ChoreCard
                  chore={chore}
                  key={`${chore.choreId}-${chore.dueDate}`}
                  tone="overdue"
                  onSubmit={() => submitDueChore(chore)}
                />
              ))}
              {choreBoard.today.map((chore) => (
                <ChoreCard
                  chore={chore}
                  key={`${chore.choreId}-${chore.dueDate}`}
                  tone="today"
                  onSubmit={() => submitDueChore(chore)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 aria-hidden="true" className="h-5 w-5 text-parent" />
              <h2 className="text-lg font-semibold">Waiting for Parent</h2>
            </div>
            {choreBoard.pendingReview.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Submitted Chores will wait here.
              </p>
            ) : (
              <div className="space-y-3">
                {choreBoard.pendingReview.map((chore) => (
                  <ChoreCard
                    chore={chore}
                    key={`${chore.choreId}-${chore.dueDate}`}
                    tone="pending"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-child" />
              <h2 className="text-lg font-semibold">Upcoming</h2>
            </div>
            {choreBoard.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Upcoming Chores will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {choreBoard.upcoming.map((chore) => (
                  <ChoreCard
                    chore={chore}
                    key={`${chore.choreId}-${chore.dueDate}`}
                    tone="upcoming"
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks aria-hidden="true" className="h-5 w-5 text-child" />
              <h2 className="text-lg font-semibold">Point Ledger</h2>
            </div>
            {pointLedger.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Approved Chores will show how your Points changed.
              </p>
            ) : (
              <div className="space-y-3">
                {pointLedger.map((entry) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                    key={entry.id}
                  >
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(entry.createdAt.slice(0, 10))}
                      </p>
                    </div>
                    <span className="rounded-md bg-child px-2 py-1 text-sm font-semibold text-child-foreground">
                      +{entry.delta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <Trophy aria-hidden="true" className="h-5 w-5 text-child" />
              <h2 className="text-lg font-semibold">Wins</h2>
            </div>
            {wins.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Approved Chores will become Wins here.
              </p>
            ) : (
              <div className="space-y-3">
                {wins.map((win) => (
                  <div
                    className="rounded-md border border-emerald-200 bg-emerald-50 p-3"
                    key={win.id}
                  >
                    <p className="font-medium">{win.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {win.description} - {formatDate(win.earnedAt.slice(0, 10))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {message ? (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  function submitDueChore(chore: ChoreOccurrence) {
    if (!household || !session) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = submitChore(household, {
        childId: session.childId,
        choreId: chore.choreId,
        occurrenceDate: chore.dueDate,
        today: getTodayDateKey(),
      });
      saveHousehold(updated);
      setMessage(`${chore.title} is waiting for Parent review.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit Chore.");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) {
      return;
    }

    setError(null);
    try {
      const childId = selectedChildId || household.children[0]?.id || "";
      const nextSession = await startChildSession(
        household,
        childId,
        pin,
      );
      saveChildSession(nextSession);
      setPin("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not enter Child View.",
      );
    }
  }

  function leaveChildView() {
    clearChildSession();
  }

  return (
    <form className="mx-auto max-w-3xl px-4 py-10" onSubmit={onSubmit}>
      <div className="rounded-md border border-border bg-background p-6 shadow-panel">
        <KeyRound aria-hidden="true" className="mb-4 h-9 w-9 text-child" />
        <h1 className="text-2xl font-semibold">Enter Child View</h1>
        <p className="mt-2 text-muted-foreground">
          Choose your profile and enter your Child PIN.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_12rem_auto]">
          <div>
            <Label htmlFor="child">Child</Label>
            <select
              className="mt-2 flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="child"
              value={selectedChildId || household.children[0]?.id || ""}
              onChange={(event) => setSelectedChildId(event.target.value)}
            >
              {household.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="pin">Child PIN</Label>
            <Input
              className="mt-2"
              id="pin"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />
          </div>
          <Button className="self-end" type="submit" variant="child">
            Enter
          </Button>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function ChoreCard({
  chore,
  tone,
  onSubmit,
}: {
  chore: ChoreOccurrence;
  tone: "overdue" | "today" | "pending" | "upcoming";
  onSubmit?: () => void;
}) {
  const toneClass =
    tone === "overdue"
      ? "border-red-200 bg-red-50"
      : tone === "pending"
        ? "border-blue-200 bg-blue-50"
        : "border-border bg-background";

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="font-medium">{chore.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(chore.dueDate)} - {chore.pointValue} Points -{" "}
            {chore.routineLabel}
          </p>
        </div>
        {onSubmit ? (
          <Button type="button" variant="child" onClick={onSubmit}>
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Submit
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateKey: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}
