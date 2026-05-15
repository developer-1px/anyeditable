import { test, expect, type Page } from '@playwright/test'

const ROOT = '.document-surface'
const STATE = '[data-testid="document-state"]'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator(ROOT).scrollIntoViewIfNeeded()
})

test('paragraph typing keeps state and DOM in sync without duplicates', async ({ page }) => {
  await setCaret(page, 0, 0)
  await page.keyboard.type('hello')
  await expectBlockText(page, 0, 'hello')
  await expect(page.locator(`${ROOT} [data-doc-block-index="0"]`)).toHaveText('hello')
})

test('heading typing updates the heading block', async ({ page }) => {
  await setCaret(page, 1, 0)
  await page.keyboard.type('Title')
  await expectBlockText(page, 1, 'Title')
  await expect(page.locator(`${ROOT} h2[data-doc-block-index="1"]`)).toHaveText('Title')
})

test('bold shortcut decorates selected inline text', async ({ page, browserName }) => {
  await selectText(page, 2, 0, 4)
  await page.keyboard.press(browserName === 'webkit' ? 'Meta+B' : 'Control+B')
  const blocks = await readBlocks(page)
  expect(blocks[2].marks).toEqual([{ kind: 'bold', from: 0, to: 4 }])
  await expect(page.locator(`${ROOT} [data-doc-mark-kind="bold"]`)).toHaveText('bold')
})

test('Enter splits and Backspace at start merges blocks', async ({ page }) => {
  await setCaret(page, 0, 0)
  await page.keyboard.type('hello')
  await page.keyboard.press('Enter')
  await page.keyboard.type('world')
  expect((await readBlocks(page)).slice(0, 2).map(block => block.text)).toEqual(['hello', 'world'])
  await setCaret(page, 1, 0)
  await page.keyboard.press('Backspace')
  expect((await readBlocks(page))[0].text).toBe('helloworld')
})

test('Korean composition commits through operation surface', async ({ page }) => {
  await setCaret(page, 0, 0)
  const prevented = await page.locator(ROOT).evaluate((root) => {
    const block = root.querySelector('[data-doc-block-index="0"]')!
    root.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }))
    const composingInput = new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertCompositionText', data: 'ㅎ' })
    root.dispatchEvent(composingInput)
    block.textContent = '한'
    root.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '한' }))
    const finalInput = new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: '한' })
    root.dispatchEvent(finalInput)
    return {
      composing: composingInput.defaultPrevented,
      final: finalInput.defaultPrevented,
    }
  })
  expect(prevented).toEqual({ composing: false, final: true })
  await expectBlockText(page, 0, '한')
  await expect(page.locator(`${ROOT} [data-doc-block-index="0"]`)).toHaveText('한')
})

async function readBlocks(page: Page): Promise<Array<{ text: string; marks?: unknown[] }>> {
  const raw = await page.locator(STATE).textContent()
  return JSON.parse(raw || '{}').blocks
}

async function expectBlockText(page: Page, index: number, text: string) {
  await expect.poll(async () => (await readBlocks(page))[index]?.text).toBe(text)
}

async function setCaret(page: Page, blockIndex: number, offset: number) {
  await page.locator(ROOT).evaluate((root, args) => {
    const { blockIndex, offset } = args as { blockIndex: number; offset: number }
    const ownerDocument = root.ownerDocument
    ;(root as HTMLElement).focus()
    const block = root.querySelector(`[data-doc-block-index="${blockIndex}"]`)!
    const walker = ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT)
    const text = walker.nextNode() ?? block.appendChild(ownerDocument.createTextNode(''))
    const range = ownerDocument.createRange()
    range.setStart(text, Math.min(offset, text.textContent?.length ?? 0))
    range.collapse(true)
    const selection = ownerDocument.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
  }, { blockIndex, offset })
}

async function selectText(page: Page, blockIndex: number, from: number, to: number) {
  await page.locator(ROOT).evaluate((root, args) => {
    const { blockIndex, from, to } = args as { blockIndex: number; from: number; to: number }
    const ownerDocument = root.ownerDocument
    ;(root as HTMLElement).focus()
    const block = root.querySelector(`[data-doc-block-index="${blockIndex}"]`)!
    const walker = ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT)
    const text = walker.nextNode()!
    const range = ownerDocument.createRange()
    range.setStart(text, from)
    range.setEnd(text, to)
    const selection = ownerDocument.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
  }, { blockIndex, from, to })
}
