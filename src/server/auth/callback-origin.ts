export const AUTH_CALLBACK_PATH = "/auth/callback";

export type AuthCallbackRequestHeaders = {
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
  origin?: string | null;
};

export type AuthCallbackEnv = {
  siteUrl?: string | null;
  vercelBranchUrl?: string | null;
  vercelEnv?: string | null;
  vercelUrl?: string | null;
};

export function resolveAuthCallbackUrl(
  headers: AuthCallbackRequestHeaders,
  env: AuthCallbackEnv = {},
): string {
  return new URL(AUTH_CALLBACK_PATH, resolveAuthCallbackOrigin(headers, env)).toString();
}

export function resolveAuthCallbackOrigin(
  headers: AuthCallbackRequestHeaders,
  env: AuthCallbackEnv = {},
): string {
  const fromOrigin = parseHttpOrigin(headers.origin);
  if (fromOrigin) {
    return fromOrigin;
  }

  const fromRequestHost = originFromRequestHost(headers);
  if (fromRequestHost) {
    return fromRequestHost;
  }

  if (isPreviewEnv(env.vercelEnv)) {
    return (
      originFromVercelHost(env.vercelBranchUrl) ??
      originFromVercelHost(env.vercelUrl) ??
      "http://localhost:3000"
    );
  }

  return (
    parseHttpOrigin(env.siteUrl) ??
    originFromVercelHost(env.vercelUrl) ??
    "http://localhost:3000"
  );
}

function isPreviewEnv(vercelEnv: string | null | undefined): boolean {
  return vercelEnv?.trim() === "preview";
}

function originFromRequestHost(headers: AuthCallbackRequestHeaders): string | null {
  const host = normalizeHost(headers.forwardedHost) ?? normalizeHost(headers.host);
  if (!host) {
    return null;
  }

  const proto = parseForwardedProto(headers.forwardedProto) ?? defaultProtoForHost(host);
  return `${proto}://${host}`;
}

function originFromVercelHost(value: string | null | undefined): string | null {
  const host = normalizeHost(value);
  if (!host) {
    return null;
  }

  return `https://${host}`;
}

function parseHttpOrigin(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "null") {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (!url.hostname) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function parseForwardedProto(value: string | null | undefined): "http" | "https" | null {
  const proto = firstHeaderValue(value)?.toLowerCase();
  if (proto === "http" || proto === "https") {
    return proto;
  }

  return null;
}

function defaultProtoForHost(host: string): "http" | "https" {
  try {
    const hostname = new URL(`https://${host}`).hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return "http";
    }
  } catch {
    return "https";
  }

  return "https";
}

function normalizeHost(value: string | null | undefined): string | null {
  const first = firstHeaderValue(value);
  if (!first) {
    return null;
  }

  const withoutScheme = first.replace(/^https?:\/\//i, "");
  const host = withoutScheme.split("/")[0]?.trim();
  if (!host || host.includes("@") || host.includes("?") || host.includes("#")) {
    return null;
  }

  try {
    const url = new URL(`https://${host}`);
    if (!url.hostname) {
      return null;
    }

    return url.host;
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string | null | undefined): string | null {
  const first = value?.split(",")[0]?.trim();
  return first ? first : null;
}
