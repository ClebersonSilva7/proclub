import { beforeEach, expect, it, vi } from "vitest";
const { state } = vi.hoisted(() => ({
  state: {
    user: { id: "u1", is_anonymous: false } as {
      id: string;
      is_anonymous: boolean;
    } | null,
    admin: false,
    club: { id: "blue", name: "Azul", slug: "clube-azul", status: "active" },
    staff: { role: "manager", status: "active" },
    filters: [] as unknown[][],
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("../src/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user }, error: null }),
    },
    from: (table: string) => {
      const builder = {
        select: () => builder,
        eq: (...args: unknown[]) => {
          state.filters.push(args);
          return builder;
        },
        maybeSingle: async () => ({
          error: null,
          data:
            table === "platform_admins"
              ? state.admin
                ? { user_id: "u1" }
                : null
              : table === "clubs"
                ? state.club
                : state.staff,
        }),
      };
      return builder;
    },
  }),
}));
import {
  requireUser,
  requirePlatformAdmin,
  requireClubManager,
} from "../src/modules/identity/access";
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://synthetic.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_synthetic";
  state.user = { id: "u1", is_anonymous: false };
  state.admin = false;
  state.club.status = "active";
  state.staff = { role: "manager", status: "active" };
  state.filters = [];
});
it("anonymous requests and anonymous Supabase accounts cannot enter protected pages", async () => {
  state.user = null;
  await expect(requireUser("/admin")).rejects.toThrow("REDIRECT:/login");
  state.user = { id: "u1", is_anonymous: true };
  await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
});
it("regular authenticated user cannot enter platform admin", async () => {
  await expect(requirePlatformAdmin()).rejects.toThrow(
    "REDIRECT:/acesso-negado",
  );
  state.admin = true;
  await expect(requirePlatformAdmin()).resolves.toHaveProperty("user.id", "u1");
});
it("club access binds membership to verified user and resolved club", async () => {
  await expect(requireClubManager("clube-azul")).resolves.toHaveProperty(
    "club.id",
    "blue",
  );
  expect(state.filters).toContainEqual(["club_id", "blue"]);
  expect(state.filters).toContainEqual(["user_id", "u1"]);
});
it("revoked staff, staff role and suspended club cannot use management route", async () => {
  state.staff.status = "revoked";
  await expect(requireClubManager("clube-azul")).rejects.toThrow(
    "acesso-negado",
  );
  state.staff = { role: "staff", status: "active" };
  await expect(requireClubManager("clube-azul")).rejects.toThrow(
    "acesso-negado",
  );
  state.staff.role = "owner";
  state.club.status = "suspended";
  await expect(requireClubManager("clube-azul")).rejects.toThrow(
    "acesso-negado",
  );
});
