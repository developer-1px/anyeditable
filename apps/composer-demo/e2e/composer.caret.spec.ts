import { test, expect, ROOT, type } from './_helpers.js'


  test('click middle of text + type inserts at clicked position', async ({ page }) => {
    await type(page, 'hello world')
    // Click at position between "hello " and "world" — character offset ~6
    await page.evaluate(() => {
      const span = document.querySelector('.composer [data-block-kind="text"]') as HTMLElement
      const tn = span.firstChild as Text
      const range = document.createRange()
      range.setStart(tn, 6)
      range.collapse(true)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
      ;(document.querySelector('.composer') as HTMLElement).focus()
    })
    await type(page, 'X')
    await expect(page.locator(ROOT)).toHaveText('hello Xworld')
  })

  test('Backspace at start of empty doc is no-op', async ({ page }) => {
    await page.keyboard.press('Backspace')
    await expect(page.locator(ROOT)).toHaveText('')
  })

  test('rapid sequential typing produces correct order', async ({ page }) => {
    // Simulates fast user typing — each keystroke in separate event tick.
    for (const ch of 'rapid') await page.keyboard.type(ch, { delay: 10 })
    await expect(page.locator(ROOT)).toHaveText('rapid')
  })

  test('select-all + type replaces full content (range replace)', async ({ page }) => {
    await type(page, 'old text')
    // Programmatic select-all — keyboard shortcuts vary by platform/agent.
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    })
    await type(page, 'new')
    const text = await page.locator(ROOT).textContent()
    expect(text).not.toContain('old')
    expect(text).toContain('new')
  })

  test('Backspace through multi-char word leaves empty', async ({ page }) => {
    await type(page, 'word')
    for (let i = 0; i < 4; i++) await page.keyboard.press('Backspace')
    await expect(page.locator(ROOT)).toHaveText('')
  })

  test('Delete (forward) removes char to the right', async ({ page }) => {
    await type(page, 'abc')
    await page.keyboard.press('Home')
    await page.keyboard.press('Delete')
    await expect(page.locator(ROOT)).toHaveText('bc')
  })

  test('Arrow navigation moves caret across chip without deleting', async ({ page }) => {
    await type(page, '@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await type(page, ' end')
    await expect(page.locator(ROOT)).toHaveText('@bob end')
    await page.keyboard.press('Home')
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
    await type(page, '!')
    // Caret should land somewhere not destroying the chip; chip count stays 1
    await expect(page.locator('.composer .chip')).toHaveCount(1)
  })

  test('Selection across chip + type replaces both text and chip', async ({ page }) => {
    await type(page, 'hi @bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await type(page, '!')
    await expect(page.locator('.composer .chip')).toHaveCount(1)
    // Select all then type — should replace chip + text with plain 'X'
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    })
    await type(page, 'X')
    await expect(page.locator('.composer .chip')).toHaveCount(0)
    await expect(page.locator(ROOT)).toHaveText('X')
  })

