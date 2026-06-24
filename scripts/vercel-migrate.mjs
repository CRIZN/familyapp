import { execFileSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("Skipping database migrations outside Vercel production.");
  process.exit(0);
}

if (!process.env.POSTGRES_URL?.trim()) {
  throw new Error("POSTGRES_URL is required to run production database migrations.");
}

console.log("Running production database migrations.");
execFileSync("npx", ["drizzle-kit", "migrate"], {
  stdio: "inherit",
});
