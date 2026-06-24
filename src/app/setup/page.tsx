import { AppShell } from "@/components/app-shell";
import { HouseholdSetupPage } from "@/features/household/household-setup-page";
import { getFirstRunSetupAccess } from "@/server/household/queries";

export default async function SetupPage() {
  const setupAccess = await getFirstRunSetupAccess();

  return (
    <AppShell tone="parent">
      {setupAccess.status === "available" ? (
        <HouseholdSetupPage parentEmail={setupAccess.email} />
      ) : (
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-md border border-border bg-background p-6 shadow-panel">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-parent">
              Household Setup
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
              Setup is unavailable.
            </h1>
            <p className="mt-3 text-muted-foreground">{setupAccess.message}</p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
