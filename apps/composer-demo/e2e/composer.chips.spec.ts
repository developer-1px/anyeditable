import { test, expect, ROOT, type } from './_helpers.js'


  test('Korean IME after committed chip (composition + mention coexistence)', async ({ page }) => {
    await type(page, '@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveText('@bob')
    await page.evaluate(() => {
      const el = document.querySelector('.composer') as HTMLElement
      el.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true }))
      el.dispatchEvent(new InputEvent('beforeinput', { data: '안', inputType: 'insertCompositionText', bubbles: true, cancelable: true }))
      el.dispatchEvent(new CompositionEvent('compositionend', { data: '안', bubbles: true }))
    })
    await expect(page.locator(ROOT)).toContainText('안')
  })

  test('Escape closes popover without committing', async ({ page }) => {
    await type(page, '@bo')
    await expect(page.locator('.popover li')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.locator('.popover')).toHaveCount(0)
    await expect(page.locator('.composer .chip')).toHaveCount(0)
    await expect(page.locator(ROOT)).toHaveText('@bo')
  })

  test('multiple chips: dropdown stays visible after first commit', async ({ page }) => {
    // Regression: aria-kernel listbox previously had `hidden` flag stuck after
    // first activate, hiding the second-trigger dropdown. Fixed by gating
    // listboxProps' hidden on c.trigger directly.
    await type(page, '@bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveText('@bob')
    await type(page, ' /run')
    await expect(page.locator('.popover')).toBeVisible()
    await expect(page.locator('.popover li')).toHaveCount(1)
  })

  test('Click popover option commits chip (alternative to ArrowDown+Enter)', async ({ page }) => {
    await type(page, '@bo')
    await expect(page.locator('.popover li')).toHaveCount(1)
    await page.locator('.popover li').first().click()
    await expect(page.locator('.composer .chip')).toHaveText('@bob')
  })

  test('first chip: Enter alone commits (no ArrowDown needed — listbox primed)', async ({ page }) => {
    await type(page, '@bo')
    await expect(page.locator('.popover li')).toHaveCount(1)
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveText('@bob')
  })

  test('multiple chips: second commit via Enter (primed listbox)', async ({ page }) => {
    await type(page, '@bo')
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveText('@bob')
    await type(page, ' /run')
    await expect(page.locator('.popover li')).toHaveCount(1)
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveCount(2)
  })

  test('Backspace at chip boundary removes chip not preceding text', async ({ page }) => {
    await type(page, 'hi @bo')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('.composer .chip')).toHaveCount(1)
    await page.keyboard.press('Backspace')
    await expect(page.locator('.composer .chip')).toHaveCount(0)
    await expect(page.locator(ROOT)).toContainText('hi ')
  })

  test('typing query refines popover filter live', async ({ page }) => {
    await type(page, '@')
    await expect(page.locator('.popover li')).toHaveCount(4)
    await type(page, 'b')
    await expect(page.locator('.popover li')).toHaveCount(1)
    await page.keyboard.press('Backspace')
    await expect(page.locator('.popover li')).toHaveCount(4)
  })

