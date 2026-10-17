import { beforeEach, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({
  client: {
    auth: {
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      exchangeCodeForSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/supabase/server", () => ({
  createClient: async () => client,
}));
import { POST } from "../src/app/auth/[action]/route";
import { GET } from "../src/app/auth/callback/route";
const call = (
  action: string,
  values: Record<string, string>,
  origin = "http://127.0.0.1:3000",
) =>
  POST(
    new Request(`http://127.0.0.1:3000/auth/${action}`, {
      method: "POST",
      headers: { Origin: origin },
      body: new URLSearchParams(values),
    }),
    { params: Promise.resolve({ action }) },
  );
beforeEach(() => {
  vi.resetAllMocks();
  process.env.APP_URL = "http://127.0.0.1:3000";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://synthetic.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_synthetic";
  client.auth.getUser.mockResolvedValue({
    data: { user: { id: "verified-id", is_anonymous: false } },
    error: null,
  });
  for (const name of [
    "signInWithPassword",
    "signOut",
    "signUp",
    "updateUser",
    "resetPasswordForEmail",
    "exchangeCodeForSession",
  ] as const)
    client.auth[name].mockResolvedValue({ error: null });
  client.from.mockReturnValue({
    upsert: vi.fn().mockResolvedValue({ error: null }),
  });
});
it("rejects cross-origin and missing-origin POST before authentication", async () => {
  for (const origin of ["https://evil.example", ""])
    expect(
      (await call("login", { email: "a@example.test", password: "pw" }, origin))
        .status,
    ).toBe(403);
  expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
});
it("rejects bad input before SDK calls", async () => {
  expect(
    (await call("signup", { email: "invalid", password: "short" })).headers.get(
      "location",
    ),
  ).toContain("status=invalid");
  expect(client.auth.signUp).not.toHaveBeenCalled();
});
it("login checks verified identity, creates only own profile and blocks external redirect", async () => {
  const r = await call("login", {
    email: "fan@example.test",
    password: "synthetic-password",
    next: "//evil.example",
    user_id: "spoof",
    role: "owner",
  });
  expect(client.auth.getUser).toHaveBeenCalled();
  expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
    email: "fan@example.test",
    password: "synthetic-password",
  });
  expect(client.from().upsert).toHaveBeenCalledWith(
    { id: "verified-id" },
    { onConflict: "id", ignoreDuplicates: true },
  );
  expect(r.headers.get("location")).toBe("http://127.0.0.1:3000/fan");
  expect(r.headers.get("cache-control")).toContain("no-store");
});
it("failed login returns generic feedback with no raw provider error", async () => {
  client.auth.signInWithPassword.mockResolvedValue({
    error: { status: 400, message: "private reason" },
  });
  expect(
    (
      await call("login", { email: "fan@example.test", password: "wrong" })
    ).headers.get("location"),
  ).toContain("status=credentials");
  expect(client.from).not.toHaveBeenCalled();
});
it("signup sends no client role or metadata and uses canonical callback", async () => {
  await call("signup", {
    email: "fan@example.test",
    password: "synthetic-password",
    role: "owner",
  });
  expect(client.auth.signUp).toHaveBeenCalledWith({
    email: "fan@example.test",
    password: "synthetic-password",
    options: { emailRedirectTo: "http://127.0.0.1:3000/auth/callback" },
  });
});
it("recovery feedback does not disclose whether account exists", async () => {
  const first = await call("recover", { email: "fan@example.test" });
  client.auth.resetPasswordForEmail.mockResolvedValue({
    error: { status: 404 },
  });
  const second = await call("recover", { email: "missing@example.test" });
  expect(first.headers.get("location")).toBe(second.headers.get("location"));
});
it("password update independently requires a verified nonanonymous user", async () => {
  client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect(
    (
      await call("password", {
        password: "synthetic-password",
        confirmation: "synthetic-password",
      })
    ).headers.get("location"),
  ).toContain("/login");
  expect(client.auth.updateUser).not.toHaveBeenCalled();
});
it("password update revokes refresh sessions and requires another login", async () => {
  const r = await call("password", {
    password: "synthetic-password",
    confirmation: "synthetic-password",
  });
  expect(client.auth.updateUser).toHaveBeenCalledWith({
    password: "synthetic-password",
  });
  expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
  expect(r.headers.get("location")).toContain("password-updated");
});
it("callback rejects missing/invalid code and exchanges PKCE code before own profile", async () => {
  expect(
    (await GET(new Request("http://127.0.0.1:3000/auth/callback"))).headers.get(
      "location",
    ),
  ).toContain("link-invalid");
  expect(client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  client.auth.exchangeCodeForSession.mockResolvedValue({
    error: { status: 400 },
  });
  expect(
    (
      await GET(new Request("http://127.0.0.1:3000/auth/callback?code=bad"))
    ).headers.get("location"),
  ).toContain("link-invalid");
  client.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  expect(
    (
      await GET(
        new Request(
          "http://127.0.0.1:3000/auth/callback?code=valid&next=https://evil.example",
        ),
      )
    ).headers.get("location"),
  ).toBe("http://127.0.0.1:3000/fan");
});
