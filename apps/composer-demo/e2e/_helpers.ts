import { test as base, type Page } from '@playwright/test'

export const ROOT = '.composer'

export async function focus(page: Page) {
  await page.locator(ROOT).click()
}

export async function type(page: Page, text: string) {
  await page.keyboard.type(text)
}

/** Composer-focused test fixture — auto-navigates and clicks the textbox. */
export const test = base.extend<Record<string, never>>({
  page: async ({ page }, use) => {
    await page.goto('/')
    await focus(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'
