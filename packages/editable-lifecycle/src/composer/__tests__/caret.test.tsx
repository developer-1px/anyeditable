import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { ChatComposerDemo } from './ChatComposerDemo.js'

afterEach(() => cleanup())

function fireBI(el: Element, data: string, inputType = 'insertText') {
  const ev = new (globalThis as { InputEvent: typeof InputEvent }).InputEvent('beforeinput', {
    inputType, data, bubbles: true, cancelable: true,
  })
  fireEvent(el, ev)
}

describe('caret restore + selection-driven caret', () => {
  it('after commitAtomic: typing lands AFTER chip, not before', () => {
    const { getByTestId } = render(<ChatComposerDemo />)
    const root = getByTestId('root')
    fireBI(root, '@'); fireBI(root, 'b')
    fireEvent.click(getByTestId('opt-u1'))
    fireBI(root, 'x')
    const blocks = root.querySelectorAll('[data-block-index]')
    expect(blocks.length).toBe(3)
    expect(blocks[2]?.textContent).toBe('x')
    expect(blocks[0]?.textContent).toBe('')
  })

  it('selectionchange → caret moves to clicked position; subsequent type inserts there', () => {
    const { getByTestId } = render(<ChatComposerDemo />)
    const root = getByTestId('root')
    fireBI(root, 'h'); fireBI(root, 'e'); fireBI(root, 'y')
    expect(root.textContent).toBe('hey')
    const span = root.querySelector('[data-block-index="0"]') as HTMLElement
    const tn = span.firstChild as Text
    const sel = root.ownerDocument.getSelection()!
    const range = root.ownerDocument.createRange()
    range.setStart(tn, 0); range.collapse(true)
    sel.removeAllRanges(); sel.addRange(range)
    root.ownerDocument.dispatchEvent(new Event('selectionchange'))
    fireBI(root, 'X')
    expect(root.textContent).toBe('Xhey')
  })
})
