"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const FAMILY_DISPLAY_REFRESH_INTERVAL_MS = 60_000;

export function FamilyDisplayRefresh() {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      router.refresh();
    }, FAMILY_DISPLAY_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router]);

  return null;
}
