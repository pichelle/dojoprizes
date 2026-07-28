// Shared helpers for the simple staff password gate.
// There is intentionally no per-user auth (PRD 4: single shared login for
// MVP) -- this just keeps the site from being publicly browsable.

export const SESSION_COOKIE = "dpb_session";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Token is derived from the password + a server-only secret, so the cookie
// value never contains the password itself and can't be guessed without
// knowing both GATE_PASSWORD and GATE_SESSION_SECRET.
export async function expectedSessionToken(): Promise<string> {
  const password = process.env.GATE_PASSWORD ?? "";
  const secret = process.env.GATE_SESSION_SECRET ?? "dev-only-secret-change-me";
  return sha256Hex(`${password}:${secret}`);
}

export async function checkPassword(candidate: string): Promise<boolean> {
  const password = process.env.GATE_PASSWORD ?? "";
  return candidate.length > 0 && candidate === password;
}
