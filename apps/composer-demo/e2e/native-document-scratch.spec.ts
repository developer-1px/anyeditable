import { expect, test, type Page } from '@playwright/test'

const ROOT = '[data-testid="native-document-scratch"]'
const STATE = '[data-testid="native-document-state"]'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator(ROOT).scrollIntoViewIfNeeded()
})

test('native text input lets DOM mutate first, then syncs state', async ({ page }) => {
  await setCaret(page, 0, 0)
  await page.keyboard.type('hello')

  await expectBlockText(page, 0, 'hello')
  await expect(page.locator(`${ROOT} [data-scratch-block-index="0"]`)).toHaveText('hello')
})

test('Enter split and Backspace merge are the only intercepted structure operations', async ({ page }) => {
  await setCaret(page, 0, 0)
  await page.keyboard.type('hello')
  await page.keyboard.press('Enter')
  await page.keyboard.type('world')

  await expect.poll(async () => (await readBlocks(page)).slice(0, 2).map(block => block.text)).toEqual(['hello', 'world'])

  await setCaret(page, 1, 0)
  await page.keyboard.press('Backspace')

  await expectBlockText(page, 0, 'helloworld')
  await expect(page.locator(`${ROOT} [data-scratch-block-index="0"]`)).toHaveText('helloworld')
})

test('Korean sequential composition preserves previous syllable from native DOM', async ({ page }) => {
  await setCaret(page, 0, 0)

  await composeDomText(page, 0, '한', '한')
  await expectBlockText(page, 0, '한')

  await setCaret(page, 0, 1)
  await composeDomText(page, 0, '한ㄱ', 'ㄱ')

  await expectBlockText(page, 0, '한ㄱ')
  await expect(page.locator(`${ROOT} [data-scratch-block-index="0"]`)).toHaveText('한ㄱ')
})

test('example markdown shortcuts convert block kind without touching the engine core', async ({ page }) => {
  await setCaret(page, 0, 0)
  await page.keyboard.type('# ')
  await page.keyboard.type('Title')

  await expectBlock(page, 0, { kind: 'heading', text: 'Title' })
  await expect(page.locator(`${ROOT} h2[data-scratch-block-index="0"]`)).toHaveText('Title')

  await page.keyboard.press('Enter')
  await page.keyboard.type('- ')
  await page.keyboard.type('item')

  await expectBlock(page, 1, { kind: 'list', text: 'item' })
})

test('example markdown paste imports plain markdown lines', async ({ page }) => {
  await setCaret(page, 0, 0)
  await page.locator(ROOT).evaluate((root) => {
    const data = new DataTransfer()
    data.setData('text/plain', '# Pasted title\n- first\n> note\nplain')
    root.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertFromPaste',
      dataTransfer: data,
    }))
  })

  await expect.poll(async () => (await readBlocks(page)).slice(0, 4).map(({ kind, text }) => [kind, text])).toEqual([
    ['heading', 'Pasted title'],
    ['list', 'first'],
    ['quote', 'note'],
    ['paragraph', 'plain'],
  ])
})

async function readBlocks(page: Page): Promise<Array<{ kind: string; text: string }>> {
  const raw = await page.locator(STATE).textContent()
  return JSON.parse(raw || '{}').blocks
}

async function expectBlockText(page: Page, index: number, text: string) {
  await expect.poll(async () => (await readBlocks(page))[index]?.text).toBe(text)
}

async function expectBlock(page: Page, index: number, block: { kind: string; text: string }) {
  await expect.poll(async () => {
    const current = (await readBlocks(page))[index]
    return current ? { kind: current.kind, text: current.text } : null
  }).toEqual(block)
}

async function setCaret(page: Page, blockIndex: number, offset: number) {
  await page.locator(ROOT).evaluate((root, args) => {
    const { blockIndex, offset } = args as { blockIndex: number; offset: number }
    const ownerDocument = root.ownerDocument
    ;(root as HTMLElement).focus()
    const block = root.querySelector(`[data-scratch-block-index="${blockIndex}"]`)!
    const range = ownerDocument.createRange()
    const walker = ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT)
    const text = walker.nextNode()
    if (text) {
      range.setStart(text, Math.min(offset, text.textContent?.length ?? 0))
    } else {
      range.setStart(block, 0)
    }
    range.collapse(true)
    const selection = ownerDocument.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
  }, { blockIndex, offset })
}

async function composeDomText(page: Page, blockIndex: number, nextText: string, data: string) {
  await page.locator(ROOT).evaluate((root, args) => {
    const { blockIndex, nextText, data } = args as { blockIndex: number; nextText: string; data: string }
    const block = root.querySelector(`[data-scratch-block-index="${blockIndex}"]`)!

    root.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }))
    root.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data }))
    block.textContent = nextText
    root.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertCompositionText',
      data,
    }))
    root.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data }))
  }, { blockIndex, nextText, data })
}
