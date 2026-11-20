import type { Page } from "@playwright/test";

/**
 * Opens a page from the main menu: the sidebar on wide screens, or the
 * bottom bar (and its More sheet) on phones and tablets.
 */
export async function openFromMenu(page: Page, name: string) {
  const link = page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name, exact: true });
  if (await link.isVisible()) {
    await link.click();
    return;
  }
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page
    .getByRole("dialog", { name: "More" })
    .getByRole("link", { name, exact: true })
    .click();
}
