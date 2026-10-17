import { expect, test } from "@playwright/test";
const enabled = Boolean(process.env.E2E_PASSWORD);
test.describe("Supabase development integration (synthetic fixtures only)", () => {
  test.skip(!enabled, "Requires disposable synthetic development accounts");
  async function login(
    page: import("@playwright/test").Page,
    email: string,
    password = process.env.E2E_PASSWORD!,
  ) {
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/fan$/);
  }
  test("fan session persists, cannot enter admin or club management, and logout removes access", async ({
    page,
    context,
  }) => {
    await login(page, process.env.E2E_FAN_EMAIL!);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Minha conta" }),
    ).toBeVisible();
    const cookies = await context.cookies();
    expect(
      cookies.some(
        (c) =>
          c.name.includes("auth-token") && c.httpOnly && c.sameSite === "Lax",
      ),
    ).toBe(true);
    await page.goto("/admin");
    await expect(page).toHaveURL(/acesso-negado/);
    await page.goto("/gestao/azul-stage3");
    await expect(page).toHaveURL(/acesso-negado/);
    const changed = process.env.E2E_PASSWORD! + "-new";
    let response = await context.request.post("/auth/password", {
      headers: { Origin: "http://127.0.0.1:3000" },
      form: { password: changed, confirmation: changed },
      maxRedirects: 0,
    });
    expect(response.headers().location).toContain("password-updated");
    await login(page, process.env.E2E_FAN_EMAIL!, changed);
    response = await context.request.post("/auth/password", {
      headers: { Origin: "http://127.0.0.1:3000" },
      form: {
        password: process.env.E2E_PASSWORD!,
        confirmation: process.env.E2E_PASSWORD!,
      },
      maxRedirects: 0,
    });
    expect(response.headers().location).toContain("password-updated");
    await login(page, process.env.E2E_FAN_EMAIL!);
    await page.goto("/fan");
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await expect(page).toHaveURL(/login/);
    await page.goto("/fan");
    await expect(page).toHaveURL(/login/);
  });
  test("manager can access own club but not another club or platform administration", async ({
    page,
  }) => {
    await login(page, process.env.E2E_MANAGER_EMAIL!);
    await page.goto("/gestao/azul-stage3");
    await expect(
      page.getByRole("heading", { name: "Gestão: Azul sintético" }),
    ).toBeVisible();
    await page.goto("/gestao/vermelho-stage3");
    await expect(page).toHaveURL(/acesso-negado/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/acesso-negado/);
  });
  test("global admin may enter administration and both clubs", async ({
    page,
  }) => {
    await login(page, process.env.E2E_ADMIN_EMAIL!);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Clubes", exact: true }),
    ).toBeVisible();
    for (const slug of ["azul-stage3", "vermelho-stage3"]) {
      await page.goto(`/gestao/${slug}`);
      await expect(
        page.getByText("Seu acesso a este clube foi verificado."),
      ).toBeVisible();
    }
  });
  test("staff cannot enter management", async ({ page }) => {
    await login(page, process.env.E2E_STAFF_EMAIL!);
    await page.goto("/gestao/azul-stage3");
    await expect(page).toHaveURL(/acesso-negado/);
  });
});
