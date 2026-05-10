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
    // Use CDP to dispatch real composition events that Hangul IME produces.
    const client = await page.context().newCDPSession(page)
    const root = page.locator(ROOT)
    await root.focus()

    await client.send('Input.imeSetComposition', { text: 'ㅎ', selectionStart: 0, selectionEnd: 1 })
    await client.send('Input.imeSetComposition', { text: '하', selectionStart: 0, selectionEnd: 1 })
    await client.send('Input.imeSetComposition', { text: '한', selectionStart: 0, selectionEnd: 1 })
    await client.send('Input.insertText', { text: '한' })

    await expect(root).toHaveText('한')

    // Continue typing — caret must be after composed char, not "pushed back"
    await client.send('Input.imeSetComposition', { text: 'ㄱ', selectionStart: 0, selectionEnd: 1 })
    await client.send('Input.imeSetComposition', { text: '구', selectionStart: 0, selectionEnd: 1 })
    await client.send('Input.imeSetComposition', { text: '국', selectionStart: 0, selectionEnd: 1 })
    await client.send('Input.insertText', { text: '국' })

    await expect(root).toHaveText('한국')
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

  test('@-mention trigger opens popover, Enter commits chip', async ({ page }) => {
    await type(page, 'hi @bo')
    await expect(page.locator('.popover')).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveText('@bob')
    await expect(page.locator('.popover')).toBeHidden()
  })

  test('/-command trigger commits chip', async ({ page }) => {
    await type(page, '/run')
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
