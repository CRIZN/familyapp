import { AppShell } from "@/components/app-shell";
import { ParentViewPage } from "@/features/parent/parent-view-page";

export default function ParentWeeklyReviewPage() {
  return (
    <AppShell tone="parent">
      <ParentViewPage workflow="weekly-review" />
    </AppShell>
  );
}
