import "server-only";

import type { Household } from "@/domain/household";

export function toClientSafeHousehold(household: Household): Household {
  return {
    ...household,
    calendarConnection: household.calendarConnection
      ? {
          ...household.calendarConnection,
          sourceUrl: "",
        }
      : null,
  };
}
