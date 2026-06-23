import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family App",
  description: "Household coordination for Parents and Children.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
