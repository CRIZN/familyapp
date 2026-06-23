import { AppShell } from "@/components/app-shell";
import { ParentViewPage } from "@/features/parent/parent-view-page";

export default function ParentCalendarPage() {
  return (
    <AppShell tone="parent">
      <ParentViewPage workflow="calendar" />
    </AppShell>
  );
}
