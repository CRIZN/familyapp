"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  setupFirstRunHousehold,
  type FirstRunSetupActionState,
} from "@/server/household/actions";

type HouseholdSetupPageProps = {
  parentEmail: string;
};

type ChildDraft = {
  name: string;
  pin: string;
};

const initialActionState: FirstRunSetupActionState = {
  message: null,
  status: "idle",
};

export function HouseholdSetupPage({ parentEmail }: HouseholdSetupPageProps) {
  const [actionState, formAction, isSubmitting] = useActionState(
    setupFirstRunHousehold,
    initialActionState,
  );
  const [householdName, setHouseholdName] = useState("");
  const [parentName, setParentName] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [children, setChildren] = useState<ChildDraft[]>([
    { name: "", pin: "" },
  ]);

  return (
    <form action={formAction} className="mx-auto max-w-4xl px-4 py-8">
      <input name="childCount" type="hidden" value={children.length} />
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-parent">
          First-Run Household Setup
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
          Create the private production Household.
        </h1>
      </div>

      <section className="mb-6 rounded-md border border-border bg-background p-5 shadow-panel">
        <Label htmlFor="householdName">Household name</Label>
        <Input
          className="mt-2"
          id="householdName"
          name="householdName"
          value={householdName}
          onChange={(event) => setHouseholdName(event.target.value)}
          placeholder="The Chen Household"
          required
        />
      </section>

      <section className="mb-6 rounded-md border border-border bg-background p-5 shadow-panel">
        <h2 className="mb-4 text-xl font-semibold">First Parent</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="parentName">Name</Label>
            <Input
              className="mt-2"
              id="parentName"
              name="parentName"
              value={parentName}
              onChange={(event) => setParentName(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="parentEmail">Authenticated email</Label>
            <Input
              className="mt-2"
              id="parentEmail"
              readOnly
              value={parentEmail}
            />
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-md border border-border bg-background p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Children</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setChildren([...children, { name: "", pin: "" }])}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Child
          </Button>
        </div>
        <div className="space-y-4">
          {children.map((child, index) => (
            <div
              className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_12rem_auto]"
              key={index}
            >
              <div>
                <Label htmlFor={`child-${index}-name`}>Name</Label>
                <Input
                  className="mt-2"
                  id={`child-${index}-name`}
                  name={`child-${index}-name`}
                  value={child.name}
                  onChange={(event) =>
                    updateChild(index, { ...child, name: event.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor={`child-${index}-pin`}>Child PIN</Label>
                <Input
                  className="mt-2"
                  id={`child-${index}-pin`}
                  inputMode="numeric"
                  maxLength={8}
                  name={`child-${index}-pin`}
                  value={child.pin}
                  onChange={(event) =>
                    updateChild(index, { ...child, pin: event.target.value })
                  }
                  required
                />
              </div>
              <Button
                aria-label="Remove Child"
                className="self-end"
                disabled={children.length === 1}
                size="icon"
                type="button"
                variant="ghost"
                onClick={() =>
                  setChildren(
                    children.filter((_, candidate) => candidate !== index),
                  )
                }
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-md border border-border bg-background p-5 shadow-panel">
        <Label htmlFor="setupToken">First-run setup token</Label>
        <Input
          className="mt-2"
          id="setupToken"
          name="setupToken"
          type="password"
          value={setupToken}
          onChange={(event) => setSetupToken(event.target.value)}
          required
        />
      </section>

      {actionState.status === "error" && actionState.message ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionState.message}
        </p>
      ) : null}

      <Button disabled={isSubmitting} type="submit" variant="parent">
        Complete Setup
      </Button>
    </form>
  );

  function updateChild(index: number, nextChild: ChildDraft) {
    setChildren(
      children.map((child, candidate) =>
        candidate === index ? nextChild : child,
      ),
    );
  }
}
