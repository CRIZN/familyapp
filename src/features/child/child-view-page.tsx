"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";
import { KeyRound, LogOut, Sparkles, UserRound } from "lucide-react";

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
          <div className="rounded-md border border-dashed border-border bg-background p-5 sm:col-span-2">
            <h2 className="text-lg font-semibold">Today</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Chores and Goals arrive in the next slices. For now, this verifies
              that the selected Child can enter their own view.
            </p>
          </div>
        </section>
      </div>
    );
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
