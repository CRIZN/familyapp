"use client";

import { useActionState } from "react";
import { LockKeyhole, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestParentMagicLink,
  type MagicLinkState,
} from "@/server/auth/actions";

const initialState: MagicLinkState = {
  message: null,
  status: "idle",
};

export function LockedAppScreen() {
  const [state, formAction, isPending] = useActionState(
    requestParentMagicLink,
    initialState,
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="rounded-md border border-border bg-card p-6 shadow-panel">
          <LockKeyhole aria-hidden="true" className="h-8 w-8 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold tracking-normal text-foreground">
            Private Family App
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This app is invite-only. Enter an authorized Parent email address to
            receive a sign-in link.
          </p>

          <form action={formAction} className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Parent email</Label>
              <Input
                autoComplete="email"
                id="email"
                name="email"
                placeholder="parent@example.com"
                required
                type="email"
              />
            </div>
            <Button disabled={isPending} type="submit">
              <Mail aria-hidden="true" className="h-4 w-4" />
              {isPending ? "Sending link" : "Send sign-in link"}
            </Button>
          </form>

          {state.message ? (
            <p
              className={
                state.status === "error"
                  ? "mt-4 text-sm text-destructive"
                  : "mt-4 text-sm text-muted-foreground"
              }
              role="status"
            >
              {state.message}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

