import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const requiredEnvVars = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "FIRST_RUN_SETUP_TOKEN",
  "CHILD_SESSION_SECRET",
  "CRON_SECRET",
];

describe("production release hardening", () => {
  it("documents required production environment variables", () => {
    const envExample = readFileSync(".env.example", "utf8");
    const releaseDoc = readFileSync("docs/PRODUCTION_RELEASE.md", "utf8");

    for (const name of requiredEnvVars) {
      expect(envExample).toContain(name);
      expect(releaseDoc).toContain(name);
    }
  });

  it("keeps Vercel configured for the Next.js production build", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      buildCommand?: string;
      crons?: Array<{ path: string; schedule: string }>;
      framework?: string;
      installCommand?: string;
    };

    expect(config.framework).toBe("nextjs");
    expect(config.installCommand).toBe("npm ci");
    expect(config.buildCommand).toBe("npm run build");
    expect(config.crons).toContainEqual({
      path: "/api/calendar/sync",
      schedule: "0 * * * *",
    });
  });

  it("does not read or write demo browser storage from production source", () => {
    const sourceFiles = getSourceFiles("src").filter(
      (path) =>
        !path.endsWith(".test.ts") &&
        !path.endsWith(".test.tsx") &&
        !path.includes(`${slash()}test${slash()}`),
    );

    for (const path of sourceFiles) {
      const source = readFileSync(path, "utf8");
      expect(source, relative(process.cwd(), path)).not.toMatch(
        /localStorage|sessionStorage/,
      );
    }
  });
});

function getSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return getSourceFiles(path);
    return stats.isFile() ? [path] : [];
  });
}

function slash() {
  return process.platform === "win32" ? "\\" : "/";
}
