import type { Metadata } from "next";

import { LockedAppScreen } from "@/features/auth/locked-app-screen";
import { PrivateAppDeniedScreen } from "@/features/auth/private-app-denied-screen";
import { getParentAppGate } from "@/server/auth/parent-access";

import "./globals.css";

export const metadata: Metadata = {
  title: "Family App",
  description: "Household coordination for Parents and Children.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gate = await getParentAppGate();

  return (
    <html lang="en">
      <body>
        {gate.status === "allowed" || gate.status === "first_run" ? (
          children
        ) : gate.status === "denied" ? (
          <PrivateAppDeniedScreen />
        ) : (
          <LockedAppScreen />
        )}
      </body>
    </html>
  );
}
