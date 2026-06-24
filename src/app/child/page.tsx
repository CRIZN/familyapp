import { AppShell } from "@/components/app-shell";
import { ChildViewPage } from "@/features/child/child-view-page";
import {
  getChildSignInOptions,
  getCurrentChildSession,
} from "@/server/child/queries";

export default async function ChildPage() {
  const childSession = await getCurrentChildSession();
  const signInOptions = childSession ? null : await getChildSignInOptions();

  return (
    <AppShell tone="child">
      <ChildViewPage
        initialHousehold={childSession?.household ?? null}
        initialSession={childSession?.session ?? null}
        signInOptions={signInOptions}
      />
    </AppShell>
  );
}
