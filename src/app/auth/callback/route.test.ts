import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = vi.hoisted(() => {
  let cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }> =
    [];

  return {
    getAll: () => cookies,
    reset: () => {
      cookies = [];
    },
    seed: (nextCookies: Array<{ name: string; value: string }>) => {
      cookies = [...nextCookies];
    },
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      const nextCookie = { name, options, value };
      const index = cookies.findIndex((cookie) => cookie.name === name);

      if (index === -1) {
        cookies = [...cookies, nextCookie];
      } else {
        cookies = [
          ...cookies.slice(0, index),
          nextCookie,
          ...cookies.slice(index + 1),
        ];
      }
    },
  };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: cookieStore.getAll,
    set: cookieStore.set,
  }),
}));

describe("auth callback route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://familyapp.supabase.co",
    };
    cookieStore.reset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("sets Supabase session cookies before redirecting from a valid magic link", async () => {
    cookieStore.seed([
      {
        name: "sb-familyapp-auth-token-code-verifier",
        value: encodeSupabaseCookieValue("pkce-verifier"),
      },
    ]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "access-token",
          expires_in: 3600,
          refresh_token: "refresh-token",
          token_type: "bearer",
          user: {
            aud: "authenticated",
            email: "parent@example.com",
            id: "user-1",
          },
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
    );
    const { GET } = await import("./route");

    const response = await GET(
      new Request("https://app.example/auth/callback?code=valid-code") as never,
    );

    expect(response.headers.get("location")).toBe("https://app.example/");
    expect(response.headers.getSetCookie()).toEqual(
      expect.arrayContaining([
        expect.stringContaining("sb-familyapp-auth-token="),
      ]),
    );
  });
});

function encodeSupabaseCookieValue(value: string): string {
  return `base64-${Buffer.from(JSON.stringify(value)).toString("base64url")}`;
}
