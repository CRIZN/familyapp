import { AppShell } from "@/components/app-shell";
import { ParentViewPage } from "@/features/parent/parent-view-page";

export default function ParentHouseholdPage() {
  return (
    <AppShell tone="parent">
      <ParentViewPage workflow="household" />
    </AppShell>
  );
}
