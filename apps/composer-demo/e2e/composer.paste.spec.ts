import { test, expect, ROOT, type } from './_helpers.js'


  test('Type → Backspace → Type produces clean sequence', async ({ page }) => {
    await type(page, 'abc')
    await page.keyboard.press('Backspace')
    await type(page, 'XY')
    await expect(page.locator(ROOT)).toHaveText('abXY')
  })

  test('Empty doc maintains caret after Backspace no-op', async ({ page }) => {
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Backspace')
    await type(page, 'hello')
    await expect(page.locator(ROOT)).toHaveText('hello')
  })

  test('Paste plain text inserts at caret', async ({ page }) => {
    await type(page, 'hi ')
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      el.focus()
      const dt = new DataTransfer()
      dt.setData('text/plain', 'pasted')
      el.dispatchEvent(new InputEvent('beforeinput', {
        inputType: 'insertFromPaste', data: null, dataTransfer: dt,
        bubbles: true, cancelable: true,
      }))
    })
    await expect(page.locator(ROOT)).toHaveText('hi pasted')
  })

  test('maxLength clamps further inserts (prod option)', async ({ page }) => {
    // App.tsx sets maxLength: 500 — exceed it
    const long = 'x'.repeat(501)
    await page.keyboard.type(long, { delay: 0 })
    const text = await page.locator(ROOT).textContent()
    expect((text ?? '').length).toBeLessThanOrEqual(500)
  })

  test('ArrowLeft past trigger anchor closes popover', async ({ page }) => {
    await page.keyboard.type('@bo')
    await expect(page.locator('[role="listbox"]')).toBeVisible()
    // Move caret left past '@' (4 chars: o, b, @ — actually 3 to get to start)
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft')
    await expect(page.locator('[role="listbox"]')).toBeHidden()
  })

  test('Backspace through @ then retype reopens popover (dismissed cleared)', async ({ page }) => {
    await page.keyboard.type('@bo')
    await expect(page.locator('[role="listbox"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="listbox"]')).toBeHidden()
    // Backspace 3 times: remove '@bo' entirely
    for (let i = 0; i < 3; i++) await page.keyboard.press('Backspace')
    await page.keyboard.type('@bo')
    // Fresh trigger at same offset — must reopen
    await expect(page.locator('[role="listbox"]')).toBeVisible()
  })

  test('Escape closes popover; further typing within same trigger does not reopen', async ({ page }) => {
    await page.keyboard.type('@bo')
    await expect(page.locator('[role="listbox"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="listbox"]')).toBeHidden()
    await page.keyboard.type('b') // continue typing same word — should NOT reopen popover
    await expect(page.locator('[role="listbox"]')).toBeHidden()
    const text = await page.locator(ROOT).textContent()
    expect(text).toBe('@bob')
  })

  test('Enter after chip-commit submits (popover-closed Enter behavior)', async ({ page }) => {
    await page.keyboard.type('@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter') // commit
    await page.keyboard.press('Enter') // submit
    const submitted = await page.locator('.submitted').textContent()
    expect(submitted).toContain('"text": "@bob"')
  })

