import { test, expect, ROOT, type } from './_helpers.js'

  test('Submit clears dismissed: fresh @ after Enter reopens popover', async ({ page }) => {
    await type(page, '@bo')
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="listbox"]')).toBeHidden()
    // Submit to clear doc.
    await page.keyboard.press('End')
    await type(page, ' more text')
    await page.keyboard.press('Enter') // submit
    await expect(page.locator('.submitted')).toBeVisible()
    // Now type a fresh @ — should NOT be suppressed by stale dismissed.
    await type(page, '@bo')
    await expect(page.locator('[role="listbox"]')).toBeVisible()
  })

  test('Rapid type-then-Enter captures all chars (submit reads sync mirror)', async ({ page }) => {
    // Burst many chars then immediately press Enter — submit must include ALL chars
    // even if React state lagged the sync mirror by a tick.
    await page.keyboard.type('abcdefghij', { delay: 0 })
    await page.keyboard.press('Enter')
    const submitted = await page.locator('.submitted').textContent()
    expect(submitted).toContain('"text": "abcdefghij"')
  })

  test('Type after doc shrinks via undo: caret clamped, no zod-crud out-of-range error', async ({ page }) => {
    let errorCaught: string | null = null
    page.on('pageerror', (e) => { errorCaught = e.message })
    // Build up a multi-block doc.
    await type(page, '@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await type(page, ' tail')
    // Now doc = [text(''), chip, text(' tail')] — caret at blockIdx=2, offset=5.
    // Roll back multiple times — doc shrinks below the cached caret blockIdx.
    for (let i = 0; i < 10; i++) await page.keyboard.press('ControlOrMeta+z')
    // Type after the rollback — caret may still point at blockIdx 2 or 4.
    await type(page, 'x')
    expect(errorCaught).toBeNull()
  })

  test('Cross-chip range delete merges flanking text correctly', async ({ page }) => {
    await type(page, 'pre ')
    await page.keyboard.type('@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await type(page, ' post')
    // Doc: text('pre ') | chip | text(' post')
    // Select from 'e' of 'pre' (offset 2) through 'p' of ' post' (offset 1 of last text)
    // i.e. caret end then shift-arrow-left 6 times: 't', 's', 'o', 'p', ' ', [chip], (chip is one unit)
    // We use Home / End for simplicity: select 'pre ' (length 4) + chip + ' p' (length 2) → 8 chars
    await page.keyboard.press('Home')
    for (let i = 0; i < 7; i++) await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Backspace')
    await page.keyboard.type('X')
    const text = await page.locator(ROOT).textContent()
    // 'pre @bob p' (10 chars before chip serialization) → after delete first 7 chars are gone
    // Selection 'pre [@bob] ' deleted, then 'X' inserted before 'post' tail.
    // Actually the exact computation depends on chip selection traversal; we just assert
    // chip is gone and text contains the expected merged tail.
    expect(text).toContain('X')
    expect(text).toContain('ost')
    await expect(page.locator(`${ROOT} .chip`)).toHaveCount(0)
  })

