import { test, expect, ROOT, type } from './_helpers.js'


  test('Korean composition while popover open does not commit chip', async ({ page }) => {
    await type(page, '@bo')
    await expect(page.locator('.popover li')).toHaveCount(1)
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      el.focus()
      el.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true }))
      el.dispatchEvent(new CompositionEvent('compositionend', { data: '안', bubbles: true }))
    })
    // composition appended to doc, popover may close or refilter, but no chip committed
    await expect(page.locator('.composer .chip')).toHaveCount(0)
  })

  test('deleteByCut clears selected range', async ({ page }) => {
    await type(page, 'keep|drop')
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      const tn = el.querySelector('[data-block-kind="text"]')?.firstChild as Text
      const range = document.createRange()
      range.setStart(tn, 5)  // after 'keep|'
      range.setEnd(tn, 9)     // end of 'drop'
      const sel = window.getSelection()!
      sel.removeAllRanges(); sel.addRange(range)
      el.focus()
      el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteByCut', bubbles: true, cancelable: true }))
    })
    await expect(page.locator(ROOT)).toHaveText('keep|')
  })

  test('insertReplacementText (autocorrect) replaces word', async ({ page }) => {
    await type(page, 'teh')
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      const tn = el.querySelector('[data-block-kind="text"]')?.firstChild as Text
      const range = document.createRange()
      range.setStart(tn, 0)
      range.setEnd(tn, 3)
      const sel = window.getSelection()!
      sel.removeAllRanges(); sel.addRange(range)
      el.focus()
      el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertReplacementText', data: 'the', bubbles: true, cancelable: true }))
    })
    await expect(page.locator(ROOT)).toHaveText('the')
  })

  test('Type → blur → refocus → type continues', async ({ page }) => {
    await type(page, 'before')
    await page.evaluate(() => (document.querySelector('.composer') as HTMLElement).blur())
    await page.waitForTimeout(150)  // past blur trigger-cancel delay
    await page.locator(ROOT).click()
    await type(page, '-after')
    await expect(page.locator(ROOT)).toHaveText('before-after')
  })

  test('Emoji input renders correctly', async ({ page }) => {
    await type(page, 'hi ')
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      el.focus()
      el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: '👋', bubbles: true, cancelable: true }))
    })
    await expect(page.locator(ROOT)).toContainText('👋')
  })
