import { describe, expect, it } from "vitest";

import { resolveAuthCallbackUrl } from "./callback-origin";

const PRODUCTION_SITE_URL = "https://familyapp-navy.vercel.app";
const PREVIEW_HOST =
  "familyapp-git-branch-hash-chris-lorenzs-projects.vercel.app";

describe("resolveAuthCallbackUrl", () => {
  it("uses a present Origin header as the callback origin", () => {
    expect(
      resolveAuthCallbackUrl(
        { origin: `https://${PREVIEW_HOST}` },
        { siteUrl: PRODUCTION_SITE_URL },
      ),
    ).toBe(`https://${PREVIEW_HOST}/auth/callback`);
  });

  it("uses x-forwarded-host and proto when Origin is missing", () => {
    expect(
      resolveAuthCallbackUrl(
        {
          forwardedHost: "preview.vercel.app",
          forwardedProto: "https",
        },
        { siteUrl: PRODUCTION_SITE_URL },
      ),
    ).toBe("https://preview.vercel.app/auth/callback");
  });

  it("uses the Vercel preview host instead of NEXT_PUBLIC_SITE_URL", () => {
    expect(
      resolveAuthCallbackUrl(
        {},
        {
          siteUrl: PRODUCTION_SITE_URL,
          vercelEnv: "preview",
          vercelUrl: PREVIEW_HOST,
        },
      ),
    ).toBe(`https://${PREVIEW_HOST}/auth/callback`);
  });

  it("uses NEXT_PUBLIC_SITE_URL when this is not a preview deploy", () => {
    expect(
      resolveAuthCallbackUrl({}, { siteUrl: PRODUCTION_SITE_URL }),
    ).toBe(`${PRODUCTION_SITE_URL}/auth/callback`);
    expect(
      resolveAuthCallbackUrl(
        {},
        {
          siteUrl: PRODUCTION_SITE_URL,
          vercelEnv: "production",
          vercelUrl: "familyapp-navy.vercel.app",
        },
      ),
    ).toBe(`${PRODUCTION_SITE_URL}/auth/callback`);
  });

  it("falls back to localhost when no request host or site env is set", () => {
    expect(resolveAuthCallbackUrl({})).toBe("http://localhost:3000/auth/callback");
  });
});
