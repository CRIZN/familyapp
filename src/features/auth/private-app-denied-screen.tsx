import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutParent } from "@/server/auth/actions";

export function PrivateAppDeniedScreen() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="rounded-md border border-border bg-card p-6 shadow-panel">
          <ShieldAlert aria-hidden="true" className="h-8 w-8 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold tracking-normal text-foreground">
            Private app
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This account does not have access. Contact the app owner if you
            expected to use this private app.
          </p>
          <form action={signOutParent} className="mt-6">
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

