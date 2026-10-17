import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      if (value) jar.set(name, value);
      else jar.delete(name);
    },
  }),
}));
import { createClient, createRecoveryClient } from "../src/lib/supabase/server";
afterEach(() => {
  vi.unstubAllGlobals();
  jar.clear();
});
it("a rejected resend preserves the verifier matching the previously issued email (real SDK)", async () => {
  process.env.APP_URL = "http://127.0.0.1:3000";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://synthetic.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_synthetic";
  let rejectResend = false;
  let firstChallenge = "";
  let exchangeVerifier = "";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url.includes("/recover")) {
        if (!rejectResend) {
          firstChallenge = body.code_challenge;
          return Response.json({});
        }
        return Response.json(
          { code: "over_email_send_rate_limit", message: "rate limit" },
          { status: 429 },
        );
      }
      if (url.includes("/token")) {
        exchangeVerifier = body.code_verifier;
        return Response.json(
          {
            code: "bad_code_verifier",
            message: "synthetic endpoint; no real code issued",
          },
          { status: 400 },
        );
      }
      throw new Error("Unexpected synthetic request");
    }),
  );
  const first = await createRecoveryClient();
  expect(
    (await first.supabase.auth.resetPasswordForEmail("synthetic@example.test"))
      .error,
  ).toBeNull();
  first.commitCookies();
  const cookiesForOriginalEmail = [...jar];
  expect(cookiesForOriginalEmail.length).toBeGreaterThan(0);
  rejectResend = true;
  const resend = await createRecoveryClient();
  expect(
    (await resend.supabase.auth.resetPasswordForEmail("synthetic@example.test"))
      .error?.status,
  ).toBe(429);
  // The route deliberately does not commit cookies on rejection.
  expect([...jar]).toEqual(cookiesForOriginalEmail);
  const callback = await createClient();
  await callback.auth.exchangeCodeForSession("synthetic-code");
  expect(exchangeVerifier).toBeTruthy();
  expect(
    createHash("sha256").update(exchangeVerifier).digest("base64url"),
  ).toBe(firstChallenge);
});
