import { test, expect, ROOT, type } from './_helpers.js'


  test('Two consecutive chips render correctly', async ({ page }) => {
    await page.keyboard.type('@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await page.keyboard.type(' @al')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator(`${ROOT} .chip`)).toHaveCount(2)
    const text = await page.locator(ROOT).textContent()
    expect(text).toBe('@bob @alice')
  })

  test('Backspace with chip at doc start removes chip; caret lands at start', async ({ page }) => {
    await page.keyboard.type('@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await type(page, 'after')
    // Move caret to start of 'after' (chip-right). Backspace removes chip.
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('Backspace')
    await page.keyboard.type('X')
    const text = await page.locator(ROOT).textContent()
    expect(text).toBe('Xafter')
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

  test('Forward Delete at chip-left boundary removes chip and merges text', async ({ page }) => {
    await type(page, 'hi ')
    await page.keyboard.type('@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await type(page, 'tail')
    // Move caret across 'tail' (4) + over chip (1) → end of 'hi ' (chip-left).
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('Delete')
    await page.keyboard.type('X')
    const text = await page.locator(ROOT).textContent()
    expect(text).toBe('hi Xtail')
  })

  test('Backspace at chip-right boundary removes chip and merges text', async ({ page }) => {
    await type(page, 'hi ')
    await page.keyboard.type('@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await type(page, 'tail')
    const before = await page.locator(ROOT).textContent()
    expect(before).toBe('hi @bobtail')
    // Move caret to start of 'tail' (just after chip)
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('Backspace')
    await page.keyboard.type('X')
    const text = await page.locator(ROOT).textContent()
    expect(text).toBe('hi Xtail')
  })

  test('Trigger detected mid-text (caret in middle of word boundary)', async ({ page }) => {
    await type(page, 'hello world')
    // Move caret to between 'hello' and ' world' (offset 5)
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft')
    await page.keyboard.type(' @bo', { delay: 0 })
    await expect(page.locator('[role="listbox"]')).toBeVisible()
  })

  test('maxLength forecasts paste size — single big paste cannot exceed limit', async ({ page }) => {
    await type(page, 'x'.repeat(450))
    const paste = 'y'.repeat(100) // would land at 550 without forecasting
    await page.evaluate(async (data) => {
      const dt = new DataTransfer()
      dt.setData('text/plain', data)
      document.querySelector('[role="textbox"]')?.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
    }, paste)
    const text = await page.locator(ROOT).textContent()
    expect((text ?? '').length).toBe(450)
  })

  test('Shift+Enter inserts linebreak (multiline)', async ({ page }) => {
    await type(page, 'line1')
    await page.keyboard.press('Shift+Enter')
    await type(page, 'line2')
    const text = await page.locator(ROOT).textContent()
    expect(text).toContain('line1')
    expect(text).toContain('line2')
    expect(text).toContain('\n')
  })
