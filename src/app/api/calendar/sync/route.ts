import { NextRequest, NextResponse } from "next/server";

import { syncCalendarFeeds } from "@/server/calendar/sync";
import { createDrizzleHouseholdRepository } from "@/server/household/repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { message: "Calendar sync is not configured." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const summary = await syncCalendarFeeds({
    repository: createDrizzleHouseholdRepository(),
  });

  return NextResponse.json({
    failures: summary.failures.length,
    message: "Calendar sync complete.",
    synced: summary.synced.length,
  });
}
