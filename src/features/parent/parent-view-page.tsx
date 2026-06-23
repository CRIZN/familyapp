"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { KeyRound, Plus, RotateCcw, ShieldCheck, UserRound } from "lucide-react";

import { updateChildPin } from "@/domain/household";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearHousehold,
  getHouseholdSnapshot,
  getHydratedSnapshot,
  getServerHydratedSnapshot,
  getServerSnapshot,
  saveHousehold,
  subscribeHousehold,
  subscribeHydration,
} from "@/features/household/local-household-store";

export function ParentViewPage() {
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
  const [pinDrafts, setPinDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hasLoaded) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-md border border-border bg-background p-6 shadow-panel">
          <p className="text-sm text-muted-foreground">Loading Parent View...</p>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-md border border-border bg-background p-6 shadow-panel">
          <ShieldCheck aria-hidden="true" className="mb-4 h-9 w-9 text-parent" />
          <h1 className="text-2xl font-semibold">Parent View</h1>
          <p className="mt-2 text-muted-foreground">
            Create the Household before managing Parents, Children, and PINs.
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

  async function savePin(childId: string) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = await updateChildPin(
        household,
        childId,
        pinDrafts[childId] ?? "",
      );
      saveHousehold(updated);
      setPinDrafts({ ...pinDrafts, [childId]: "" });
      setMessage("Child PIN updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update PIN.");
    }
  }

  function resetDemoState() {
    clearHousehold();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-parent">
            Parent View
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            {household.name}
          </h1>
        </div>
        <Button type="button" variant="outline" onClick={resetDemoState}>
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Reset demo state
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-md border border-border bg-background p-5 shadow-panel">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Parents</h2>
          </div>
          <div className="space-y-3">
            {household.parents.map((parent) => (
              <div className="rounded-md border border-border p-3" key={parent.id}>
                <p className="font-medium">{parent.name}</p>
                <p className="text-sm text-muted-foreground">{parent.email}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-border bg-background p-5 shadow-panel lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <UserRound aria-hidden="true" className="h-6 w-6 text-child" />
            <h2 className="text-xl font-semibold">Children and PINs</h2>
          </div>
          <div className="space-y-4">
            {household.children.map((child) => (
              <div
                className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_12rem_auto]"
                key={child.id}
              >
                <div>
                  <p className="font-medium">{child.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {child.pointBalance} Points
                  </p>
                </div>
                <div>
                  <Label htmlFor={`${child.id}-pin`}>New Child PIN</Label>
                  <Input
                    className="mt-2"
                    id={`${child.id}-pin`}
                    inputMode="numeric"
                    maxLength={8}
                    value={pinDrafts[child.id] ?? ""}
                    onChange={(event) =>
                      setPinDrafts({
                        ...pinDrafts,
                        [child.id]: event.target.value,
                      })
                    }
                  />
                </div>
                <Button
                  className="self-end"
                  type="button"
                  variant="parent"
                  onClick={() => savePin(child.id)}
                >
                  <KeyRound aria-hidden="true" className="h-4 w-4" />
                  Update PIN
                </Button>
              </div>
            ))}
          </div>

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
        </section>
      </div>

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-dashed border-border bg-background p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Plus aria-hidden="true" className="h-5 w-5" />
            Next Slice
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Chore creation will land here after the setup tracer.
          </p>
        </div>
        <Link
          className="rounded-md border border-border bg-child p-5 text-child-foreground shadow-panel transition-colors hover:bg-child/90"
          href="/child"
        >
          <h2 className="text-lg font-semibold">Open Child View</h2>
          <p className="mt-2 text-sm text-child-foreground/80">
            Select a Child profile and enter the Child PIN.
          </p>
        </Link>
      </section>
    </div>
  );
}
