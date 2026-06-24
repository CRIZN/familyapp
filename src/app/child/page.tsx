import { AppShell } from "@/components/app-shell";
import { ChildViewPage } from "@/features/child/child-view-page";
import { getCurrentParentHousehold } from "@/server/household/queries";

export default async function ChildPage() {
  const household = await getCurrentParentHousehold();

  return (
    <AppShell tone="child">
      <ChildViewPage initialHousehold={household} />
    </AppShell>
  );
}
