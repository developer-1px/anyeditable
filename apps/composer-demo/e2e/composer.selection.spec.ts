import { test, expect, ROOT, type } from './_helpers.js'

  test('Select text + Backspace clears selection', async ({ page }) => {
    await type(page, 'hello')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('Backspace')
    await expect(page.locator(ROOT)).toHaveText('')
  })

  test('Select partial text + Backspace removes only selection', async ({ page }) => {
    await type(page, 'hello world')
    await page.keyboard.press('End')
    for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowLeft')
    await page.keyboard.press('Backspace')
    await expect(page.locator(ROOT)).toHaveText('hello')
  })

  test('Select-all + type replaces whole doc with single char', async ({ page }) => {
    await type(page, 'hi ')
    await page.keyboard.type('@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await type(page, 'tail')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('X')
    const text = await page.locator(ROOT).textContent()
    expect(text).toBe('X')
  })
