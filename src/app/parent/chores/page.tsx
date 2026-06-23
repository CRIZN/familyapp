import { AppShell } from "@/components/app-shell";
import { ParentViewPage } from "@/features/parent/parent-view-page";

export default function ParentChoresPage() {
  return (
    <AppShell tone="parent">
      <ParentViewPage workflow="chores" />
    </AppShell>
  );
}
