import { AppShell } from "@/components/app-shell";
import { ParentViewPage } from "@/features/parent/parent-view-page";

export default function ParentPage() {
  return (
    <AppShell tone="parent">
      <ParentViewPage />
    </AppShell>
  );
}
