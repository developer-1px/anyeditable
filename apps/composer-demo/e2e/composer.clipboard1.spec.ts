import { test, expect, ROOT, type } from './_helpers.js'

  test('compositionend with empty data does not corrupt doc', async ({ page }) => {
    await type(page, 'hi')
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      el.focus()
      el.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true }))
      el.dispatchEvent(new CompositionEvent('compositionend', { data: '', bubbles: true }))
    })
    await expect(page.locator(ROOT)).toHaveText('hi')
  })

  test('Cut on atomic chip preserves chip serialization', async ({ page }) => {
    await type(page, '@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveText('@bob')
    // Select-all + cut — clipboard should receive serialized @bob form
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()!
      sel.removeAllRanges(); sel.addRange(range)
      const dt = new DataTransfer()
      const cut = new ClipboardEvent('cut', { bubbles: true, cancelable: true, clipboardData: dt })
      el.dispatchEvent(cut)
      ;(window as { __cut?: string }).__cut = dt.getData('text/plain')
    })
    const cutText = await page.evaluate(() => (window as { __cut?: string }).__cut)
    expect(cutText).toContain('@bob')
  })

  test('Delete (forward) at chip-left boundary removes chip', async ({ page }) => {
    await type(page, '@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveCount(1)
    // Move caret to start, press Delete
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      el.focus()
      const range = document.createRange()
      range.setStart(el, 0)
      range.collapse(true)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    })
    await page.keyboard.press('Delete')
    await expect(page.locator('.composer .chip')).toHaveCount(0)
  })

  test('Chip at start: type before chip', async ({ page }) => {
    // Commit @bob at start of doc
    await type(page, '@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveText('@bob')
    // Move caret to start, type 'hi '
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      el.focus()
      const range = document.createRange()
      range.setStart(el, 0)
      range.collapse(true)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    })
    await type(page, 'hi ')
    await expect(page.locator(ROOT)).toHaveText('hi @bob')
  })

