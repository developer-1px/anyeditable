import { test, expect, ROOT, type } from './_helpers.js'

  test('Chip serialization round-trip via onSubmit (single chip)', async ({ page }) => {
    await type(page, 'msg @bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveText('@bob')
    await page.keyboard.press('Enter')
    const submitted = await page.locator('.submitted').textContent()
    // payload JSON contains both doc.blocks and serialized text
    expect(submitted).toContain('"text": "msg @bob"')
  })

  test('Long rapid typing (200 chars) preserves order', async ({ page }) => {
    const chars = 'abcdefghij'.repeat(20)
    await page.keyboard.type(chars, { delay: 0 })
    await expect(page.locator(ROOT)).toHaveText(chars)
  })

  test('Synchronous burst of beforeinput preserves order (state batching regression)', async ({ page }) => {
    // useSyncDocOps maintains a synchronous doc snapshot. Without it, React
    // setState batching across same-tick dispatches would produce reversed
    // text like "dlrow olleh".
    await page.locator(ROOT).click()
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      el.focus()
      for (const ch of 'helloworld') {
        el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }))
      }
    })
    await expect(page.locator(ROOT)).toHaveText('helloworld')
  })

  test('Type-then-backspace cycles produce expected text', async ({ page }) => {
    await type(page, 'one')
    await page.keyboard.press('Backspace')
    await type(page, 'TWO')
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Backspace')
    await type(page, 'X')
    await expect(page.locator(ROOT)).toHaveText('onTX')
  })

