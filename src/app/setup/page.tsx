import { AppShell } from "@/components/app-shell";
import { HouseholdSetupPage } from "@/features/household/household-setup-page";

export default function SetupPage() {
  return (
    <AppShell tone="parent">
      <HouseholdSetupPage />
    </AppShell>
  );
}
