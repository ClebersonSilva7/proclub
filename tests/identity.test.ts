import { describe, it, expect } from "vitest";
import {
  safeDestination,
  signupSchema,
  passwordUpdateSchema,
} from "../src/modules/identity/validation";
import { appOrigin } from "../src/lib/supabase/config";

describe("auth input boundaries", () => {
  it("rejects external, encoded, protocol-relative and arbitrary destinations", () => {
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/%2f%2fevil.example",
      "/fan?next=//evil.example",
      "/auth/logout",
      null,
      ["/admin"],
    ])
      expect(safeDestination(value)).toBe("/fan");
    for (const value of ["/admin", "/redefinir-senha", "/gestao/clube-azul"])
      expect(safeDestination(value)).toBe(value);
  });
  it("requires strong matching passwords and strips browser authorization fields", () => {
    expect(
      signupSchema.safeParse({ email: "fan@example.test", password: "short" })
        .success,
    ).toBe(false);
    expect(
      signupSchema.parse({
        email: "fan@example.test",
        password: "a-strong-password",
        role: "owner",
        club_id: "spoof",
      }),
    ).toEqual({ email: "fan@example.test", password: "a-strong-password" });
    expect(
      passwordUpdateSchema.safeParse({
        password: "a-strong-password",
        confirmation: "different",
      }).success,
    ).toBe(false);
  });
  it("rejects unsafe canonical origins", () => {
    const before = process.env.APP_URL;
    try {
      for (const value of [
        "http://evil.example",
        "https://user:pass@example.test",
        "https://example.test/path",
      ]) {
        process.env.APP_URL = value;
        expect(() => appOrigin()).toThrow();
      }
    } finally {
      if (before === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = before;
    }
  });
});
