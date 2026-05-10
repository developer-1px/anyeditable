import { test, expect, type Page } from '@playwright/test'

const ROOT = '.composer'

async function focus(page: Page) {
  await page.locator(ROOT).click()
}

async function type(page: Page, text: string) {
  await page.keyboard.type(text)
}

test.describe('Composer e2e — real browser, real contenteditable', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await focus(page)
  })

  test('basic text input', async ({ page }) => {
    await type(page, 'hello')
    await expect(page.locator(ROOT)).toHaveText('hello')
  })

  test('Korean IME composition does not regress (한글)', async ({ page }) => {
    // Simulate Hangul IME composition. Real OS IME fires events across frames;
    // we split syllables so React state can flush between them.
    await page.locator(ROOT).focus()
    const composeSyllable = (data: string, intermediates: string[]) => page.evaluate(({ data, intermediates }) => {
      const el = document.querySelector('.composer') as HTMLElement
      el.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true }))
      for (const inter of intermediates) {
        el.dispatchEvent(new InputEvent('beforeinput', { data: inter, inputType: 'insertCompositionText', bubbles: true, cancelable: true }))
        el.dispatchEvent(new CompositionEvent('compositionupdate', { data: inter, bubbles: true }))
      }
      el.dispatchEvent(new CompositionEvent('compositionend', { data, bubbles: true }))
    }, { data, intermediates })
    await composeSyllable('한', ['ㅎ', '하', '한'])
    await expect(page.locator(ROOT)).toHaveText('한')
    await composeSyllable('국', ['ㄱ', '구', '국'])
    await expect(page.locator(ROOT)).toHaveText('한국')
  })

  test('text node identity preserved across keystrokes (reconciler in-place mutation)', async ({ page }) => {
    await type(page, 'abc')
    const tn1Id = await page.evaluate(() => {
      const span = document.querySelector('.composer [data-block-kind="text"]')
      const tn = span?.firstChild
      ;(tn as Node & { __probe?: number }).__probe = Math.random()
      return (tn as Node & { __probe?: number }).__probe
    })
    await type(page, 'd')
    const tn2Id = await page.evaluate(() => {
      const span = document.querySelector('.composer [data-block-kind="text"]')
      return (span?.firstChild as Node & { __probe?: number }).__probe
    })
    expect(tn2Id).toBe(tn1Id)
    await expect(page.locator(ROOT)).toHaveText('abcd')
  })

  test('@-mention trigger opens popover, ArrowDown+Enter commits chip', async ({ page }) => {
    await type(page, 'hi @bo')
    await expect(page.locator('.popover li')).toHaveCount(1)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveText('@bob')
    await expect(page.locator('.popover')).toHaveCount(0)
  })

  test('/-command trigger commits chip', async ({ page }) => {
    await type(page, '/run')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveText('/run')
  })

  test('Backspace deletes character', async ({ page }) => {
    await type(page, 'hello')
    await page.keyboard.press('Backspace')
    await expect(page.locator(ROOT)).toHaveText('hell')
  })

  test('Backspace removes atomic chip whole', async ({ page }) => {
    await type(page, '@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')  // commit @bob
    await expect(page.locator('.composer .chip')).toHaveText('@bob')
    await page.keyboard.press('Backspace')
    await expect(page.locator('.composer .chip')).toHaveCount(0)
  })

  test('Enter submits doc and clears', async ({ page }) => {
    await type(page, 'hi there')
    await page.keyboard.press('Enter')
    await expect(page.locator('.submitted')).toContainText('hi there')
    await expect(page.locator(ROOT)).toHaveText('')
  })

  test('Cmd+Z undoes last keystroke', async ({ page }) => {
    await type(page, 'abc')
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${mod}+z`)
    await expect(page.locator(ROOT)).not.toHaveText('abc')
  })

  test('placeholder visible when empty', async ({ page }) => {
    const placeholder = await page.locator(ROOT).getAttribute('data-placeholder')
    expect(placeholder).toBeTruthy()
  })
})
