import { getTodayDateKey } from "@/domain/dates";
import { assembleFamilyDisplaySnapshot } from "@/domain/family-display";
import { FamilyDisplayPage } from "@/features/display/family-display-page";
import { getCurrentParentHousehold } from "@/server/household/queries";

export default async function ParentDisplayPage() {
  const household = await getCurrentParentHousehold();
  const snapshot = household
    ? assembleFamilyDisplaySnapshot(household, getTodayDateKey())
    : null;

  return <FamilyDisplayPage snapshot={snapshot} />;
}
