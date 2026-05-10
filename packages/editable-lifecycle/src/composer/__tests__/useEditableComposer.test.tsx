import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { useEditableComposer } from '../useEditableComposer.js'
import { EMPTY_DOC } from '../schema.js'
import { Harness, makeOps } from './Harness.js'

afterEach(() => cleanup())

function fireBI(el: Element, data: string, inputType = 'insertText') {
  const ev = new (globalThis as { InputEvent: typeof InputEvent }).InputEvent('beforeinput', {
    inputType, data, bubbles: true, cancelable: true,
  })
  fireEvent(el, ev)
  return ev
}

describe('useEditableComposer DOM integration', () => {
  it('insertText through zod-crud applyPatch', () => {
    const { getByTestId } = render(<Harness />)
    const root = getByTestId('root')
    fireBI(root, 'h'); fireBI(root, 'i')
    expect(root.textContent).toBe('hi')
  })

  it('@ trigger detection', () => {
    let last: unknown = null
    const { getByTestId } = render(<Harness onTriggerChange={t => { if (t) last = t }} />)
    const root = getByTestId('root')
    fireBI(root, '@'); fireBI(root, 'b')
    expect((last as { kind: string; query: string } | null)?.kind).toBe('mention')
    expect((last as { kind: string; query: string } | null)?.query).toBe('b')
  })

  it('Delete key (deleteContentForward) inputType branch (at-end no-op)', () => {
    const { getByTestId } = render(<Harness />)
    const root = getByTestId('root')
    fireBI(root, 'h'); fireBI(root, 'i')
    fireBI(root, '', 'deleteContentForward')
    expect(root.textContent).toBe('hi')
  })

  it('range selection + insertText replaces selected range (single text block)', () => {
    const { getByTestId } = render(<Harness />)
    const root = getByTestId('root')
    fireBI(root, 'h'); fireBI(root, 'e'); fireBI(root, 'y')
    expect(root.textContent).toBe('hey')
    const span = root.querySelector('[data-block-index="0"]') as HTMLElement
    const tn = span.firstChild as Text
    const sel = root.ownerDocument.getSelection()!
    const range = root.ownerDocument.createRange()
    range.setStart(tn, 0); range.setEnd(tn, 3)
    sel.removeAllRanges(); sel.addRange(range)
    fireBI(root, 'X')
    expect(root.textContent).toBe('X')
  })

  it('range selection + Backspace deletes range', () => {
    const { getByTestId } = render(<Harness />)
    const root = getByTestId('root')
    fireBI(root, 'h'); fireBI(root, 'i')
    const span = root.querySelector('[data-block-index="0"]') as HTMLElement
    const tn = span.firstChild as Text
    const sel = root.ownerDocument.getSelection()!
    const range = root.ownerDocument.createRange()
    range.setStart(tn, 0); range.setEnd(tn, 2)
    sel.removeAllRanges(); sel.addRange(range)
    fireBI(root, '', 'deleteContentBackward')
    expect(root.textContent).toBe('')
  })

  it('insertLineBreak (Shift+Enter) inserts \\n into current text block', () => {
    const { getByTestId } = render(<Harness />)
    const root = getByTestId('root')
    fireBI(root, 'a')
    fireBI(root, '', 'insertLineBreak')
    fireBI(root, 'b')
    expect(root.textContent).toBe('a\nb')
  })

  it('aria-multiline defaults to true (matches Shift+Enter linebreak support)', () => {
    const { getByTestId } = render(<Harness />)
    const root = getByTestId('root')
    expect(root.getAttribute('aria-multiline')).toBe('true')
    expect(root.getAttribute('role')).toBe('textbox')
  })

  it('Enter without Shift fires onSubmit', () => {
    const onSubmit = vi.fn()
    function H() {
      const [doc, setDoc] = useState(EMPTY_DOC)
      const c = useEditableComposer({ doc, ops: makeOps(() => doc, setDoc), triggers: {} as Record<string, never>, onSubmit })
      return <div data-testid="r" {...c.rootProps} />
    }
    const { getByTestId } = render(<H />)
    fireEvent.keyDown(getByTestId('r'), { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
