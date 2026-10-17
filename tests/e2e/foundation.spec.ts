import { expect, test } from "@playwright/test";
test("base navegável em português", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await page.getByRole("link", { name: "Acessar minha conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Entrar no ProClub" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("rota inexistente e saúde", async ({ page, request }) => {
  const response = await page.goto("/pagina-inexistente");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("link", { name: "Voltar ao início" }),
  ).toBeVisible();
  expect(await (await request.get("/api/health")).json()).toEqual({
    status: "ok",
    service: "proclub",
  });
});
