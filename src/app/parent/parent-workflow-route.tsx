import { AppShell } from "@/components/app-shell";
import {
  ParentViewPage,
  type ParentWorkflow,
} from "@/features/parent/parent-view-page";
import { getCurrentParentHousehold } from "@/server/household/queries";

export async function ParentWorkflowRoute({
  workflow = "today",
}: {
  workflow?: ParentWorkflow;
}) {
  const household = await getCurrentParentHousehold();

  return (
    <AppShell tone="parent">
      <ParentViewPage initialHousehold={household} workflow={workflow} />
    </AppShell>
  );
}
