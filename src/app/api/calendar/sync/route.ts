import { NextRequest, NextResponse } from "next/server";

import { syncAllCalendarConnections } from "@/server/calendar/service";
import { createDrizzleHouseholdRepository } from "@/server/household/repository";

export async function GET(request: NextRequest) {
  if (!isVercelCronRequest(request)) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  const result = await syncAllCalendarConnections({
    repository: createDrizzleHouseholdRepository(),
  });

  return NextResponse.json(result);
}

export function isVercelCronRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";
  return userAgent.includes("vercel-cron");
}
