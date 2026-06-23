"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { createHousehold } from "@/domain/household";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveHousehold } from "./local-household-store";

type ParentDraft = {
  name: string;
  email: string;
};

type ChildDraft = {
  name: string;
  pin: string;
};

export function HouseholdSetupPage() {
  const router = useRouter();
  const [householdName, setHouseholdName] = useState("");
  const [parents, setParents] = useState<ParentDraft[]>([
    { name: "", email: "" },
  ]);
  const [children, setChildren] = useState<ChildDraft[]>([
    { name: "", pin: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const household = await createHousehold({
        householdName,
        parents,
        children,
      });
      saveHousehold(household);
      router.push("/parent");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Setup failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mx-auto max-w-4xl px-4 py-8" onSubmit={onSubmit}>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-parent">
          Household Setup
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
          Set up the first Parent and Child profiles.
        </h1>
      </div>

      <section className="mb-6 rounded-md border border-border bg-background p-5 shadow-panel">
        <Label htmlFor="householdName">Household name</Label>
        <Input
          className="mt-2"
          id="householdName"
          value={householdName}
          onChange={(event) => setHouseholdName(event.target.value)}
          placeholder="The Chen Household"
        />
      </section>

      <section className="mb-6 rounded-md border border-border bg-background p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Parents</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setParents([...parents, { name: "", email: "" }])}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Parent
          </Button>
        </div>
        <div className="space-y-4">
          {parents.map((parent, index) => (
            <div
              className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_auto]"
              key={index}
            >
              <div>
                <Label htmlFor={`parent-${index}-name`}>Name</Label>
                <Input
                  className="mt-2"
                  id={`parent-${index}-name`}
                  value={parent.name}
                  onChange={(event) =>
                    updateParent(index, { ...parent, name: event.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor={`parent-${index}-email`}>Email</Label>
                <Input
                  className="mt-2"
                  id={`parent-${index}-email`}
                  type="email"
                  value={parent.email}
                  onChange={(event) =>
                    updateParent(index, {
                      ...parent,
                      email: event.target.value,
                    })
                  }
                />
              </div>
              <Button
                aria-label="Remove Parent"
                className="self-end"
                disabled={parents.length === 1}
                size="icon"
                type="button"
                variant="ghost"
                onClick={() =>
                  setParents(parents.filter((_, candidate) => candidate !== index))
                }
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          ))}
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
                  value={child.name}
                  onChange={(event) =>
                    updateChild(index, { ...child, name: event.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor={`child-${index}-pin`}>Child PIN</Label>
                <Input
                  className="mt-2"
                  id={`child-${index}-pin`}
                  inputMode="numeric"
                  maxLength={8}
                  value={child.pin}
                  onChange={(event) =>
                    updateChild(index, { ...child, pin: event.target.value })
                  }
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

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Button disabled={isSubmitting} type="submit" variant="parent">
        Complete Setup
      </Button>
    </form>
  );

  function updateParent(index: number, nextParent: ParentDraft) {
    setParents(
      parents.map((parent, candidate) =>
        candidate === index ? nextParent : parent,
      ),
    );
  }

  function updateChild(index: number, nextChild: ChildDraft) {
    setChildren(
      children.map((child, candidate) =>
        candidate === index ? nextChild : child,
      ),
    );
  }
}
