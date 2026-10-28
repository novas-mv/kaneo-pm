import { createSign } from "node:crypto";

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

let cached: { token: string; expiresAt: number } | null = null;

// Accepts the key file's JSON as-is or base64-encoded, since multi-line JSON is
// awkward to put in an environment variable.
export function readServiceAccount(
  raw = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON,
): ServiceAccount | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const json = value.startsWith("{")
      ? value
      : Buffer.from(value, "base64").toString("utf8");
    const parsed = JSON.parse(json) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      token_uri: parsed.token_uri,
    };
  } catch {
    return null;
  }
}

export function isGoogleCalendarConfigured() {
  return readServiceAccount() !== null;
}

export function serviceAccountEmail() {
  return readServiceAccount()?.client_email ?? null;
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

export function signAssertion(account: ServiceAccount, now: number) {
  const tokenUri = account.token_uri ?? DEFAULT_TOKEN_URI;
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(account.private_key);
  return `${header}.${claims}.${base64url(signature)}`;
}

export async function getAccessToken(): Promise<string> {
  const nowMs = Date.now();
  if (cached && cached.expiresAt - 60_000 > nowMs) return cached.token;

  const account = readServiceAccount();
  if (!account) {
    throw new Error("GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON is not configured");
  }

  const response = await fetch(account.token_uri ?? DEFAULT_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signAssertion(account, Math.floor(nowMs / 1000)),
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token request failed (${response.status})`);
  }
  const body = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cached = {
    token: body.access_token,
    expiresAt: nowMs + body.expires_in * 1000,
  };
  return cached.token;
}
