import { AppShell } from "@/components/app-shell";
import { ChildViewPage } from "@/features/child/child-view-page";

export default function ChildPage() {
  return (
    <AppShell tone="child">
      <ChildViewPage />
    </AppShell>
  );
}
