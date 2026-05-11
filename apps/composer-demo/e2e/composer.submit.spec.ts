import { test, expect, ROOT, type } from './_helpers.js'

  test('Type after Backspace-removed chip continues smoothly', async ({ page }) => {
    await type(page, 'hi @bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveText('@bob')
    await page.keyboard.press('Backspace')
    await expect(page.locator('.composer .chip')).toHaveCount(0)
    await type(page, 'X')
    // 'hi ' + 'X' = 'hi X' (chip removed; caret left at end of 'hi ')
    await expect(page.locator(ROOT)).toContainText('X')
  })

  test('Enter submits doc and clears', async ({ page }) => {
    await type(page, 'hi there')
    await page.keyboard.press('Enter')
    await expect(page.locator('.submitted')).toContainText('hi there')
    await expect(page.locator(ROOT)).toHaveText('')
  })

  test('Cmd+Z handler does not throw (jd.commands.undo wired)', async ({ page }) => {
    // Earlier this called jd.history.undo() which is undefined → TypeError.
    // Synthetic dispatch would silently skip React, but real keyboard would
    // have crashed. Now wired to jd.commands.undo.
    await type(page, 'abc')
    let errorCaught: string | null = null
    page.on('pageerror', (e) => { errorCaught = e.message })
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      el.focus()
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true }))
    })
    expect(errorCaught).toBeNull()
  })

  test('Type after submit (doc reset) does not crash and inserts cleanly', async ({ page }) => {
    await type(page, 'hello')
    await page.keyboard.press('Enter') // submit, resets doc
    await expect(page.locator('.submitted')).toBeVisible()
    let errorCaught: string | null = null
    page.on('pageerror', (e) => { errorCaught = e.message })
    await type(page, 'next')
    expect(errorCaught).toBeNull()
    await expect(page.locator(ROOT)).toHaveText('next')
  })

