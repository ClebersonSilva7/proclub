import { expect, test } from "@playwright/test";
test("protected pages require authentication", async ({ page }) => {
  for (const route of [
    "/admin",
    "/fan",
    "/gestao/clube-azul",
    "/redefinir-senha",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Entrar no ProClub" }),
    ).toBeVisible();
  }
});
test("signup and recovery forms have labels, validation and mobile layout", async ({
  page,
}) => {
  await page.goto("/cadastro");
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
    "minlength",
    "12",
  );
  await page.getByLabel("E-mail", { exact: true }).fill("fan@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("short");
  expect(
    await page
      .locator("form.auth-form")
      .evaluate((f: HTMLFormElement) => f.checkValidity()),
  ).toBe(false);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/recuperar-senha");
  await expect(
    page.getByRole("button", { name: "Enviar link de recuperação" }),
  ).toBeVisible();
});
test("cross-origin auth POST is blocked", async ({ request }) => {
  const r = await request.post("/auth/login", {
    headers: { Origin: "https://evil.example" },
    form: { email: "fan@example.test", password: "synthetic-password" },
  });
  expect(r.status()).toBe(403);
});
test("invalid callbacks do not open protected content or external destinations", async ({
  page,
}) => {
  await page.goto("/auth/callback?next=https://evil.example");
  await expect(page).toHaveURL(/\/login\?status=link-invalid/);
  await expect(page.locator(".form-message[role=alert]")).toContainText(
    "inválido ou expirou",
  );
});

test('recovery feedback distinguishes send limit and browser validation failure', async ({ page }) => {
  await page.goto('/recuperar-senha?status=rate-limit');
  await expect(page.locator('.form-message[role=alert]')).toContainText('Muitas tentativas');
  await expect(page.getByText('Se houver uma conta com esse e-mail')).toHaveCount(0);
  await page.goto('/login?status=link-browser');
  await expect(page.locator('.form-message[role=alert]')).toContainText('navegador onde pediu a recuperação');
});
