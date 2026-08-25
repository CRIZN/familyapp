import { describe, expect, it } from "vitest";

import {
  getAuthCallbackForwardHref,
  hasRedeemableAuthParams,
  readAuthLinkErrorMessage,
  safeNextPath,
} from "./magic-link-params";

describe("magic-link params", () => {
  it("forwards a Site URL landing that carries a PKCE code to the callback", () => {
    expect(
      getAuthCallbackForwardHref("https://familyapp-navy.vercel.app/?code=pkce-code"),
    ).toBe("https://familyapp-navy.vercel.app/auth/callback?code=pkce-code");
  });

  it("forwards token_hash and type to the callback", () => {
    expect(
      getAuthCallbackForwardHref(
        "https://app.example/?token_hash=hash&type=magiclink",
      ),
    ).toBe("https://app.example/auth/callback?token_hash=hash&type=magiclink");
  });

  it("does not treat a bare visit or an error landing as redeemable", () => {
    expect(hasRedeemableAuthParams(new URLSearchParams())).toBe(false);
    expect(
      hasRedeemableAuthParams(
        new URLSearchParams("error=access_denied&error_code=otp_expired"),
      ),
    ).toBe(false);
    expect(
      getAuthCallbackForwardHref(
        "https://app.example/?error=access_denied&error_code=otp_expired",
      ),
    ).toBeNull();
  });

  it("keeps callback requests on the callback", () => {
    expect(
      getAuthCallbackForwardHref(
        "https://app.example/auth/callback?code=pkce-code",
      ),
    ).toBeNull();
  });

  it("shows a specific error for failed or consumed links without echoing tokens", () => {
    expect(readAuthLinkErrorMessage("?authError=invalid_link")).toBe(
      "This sign-in link is invalid or has expired. Request a new one.",
    );
    expect(
      readAuthLinkErrorMessage("?error=access_denied&error_code=otp_expired"),
    ).toBe("This sign-in link is invalid or has expired. Request a new one.");
    expect(readAuthLinkErrorMessage("")).toBeNull();
  });

  it("rejects open redirects in next", () => {
    expect(safeNextPath("/parent")).toBe("/parent");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
  });
});
