import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { resolveRange } from '../resolveRange.js'

afterEach(() => cleanup())

function renderDoc() {
  const { container } = render(
    <div data-testid="root">
      <span data-block-index={0} data-block-kind="text">hi </span>
      <span data-block-index={1} data-block-kind="mention" contentEditable={false}>@bob</span>
      <span data-block-index={2} data-block-kind="text"> check</span>
    </div>
  )
  return container.querySelector('[data-testid="root"]') as HTMLElement
}

describe('resolveRange', () => {
  it('collapsed range (caret) within text block', () => {
    const root = renderDoc()
    const tn = root.querySelector('[data-block-index="0"]')!.firstChild!
    const sel = root.ownerDocument.getSelection()!
    const range = root.ownerDocument.createRange()
    range.setStart(tn, 1); range.collapse(true)
    sel.removeAllRanges(); sel.addRange(range)
    const r = resolveRange(root, sel)
    expect(r?.collapsed).toBe(true)
    expect(r?.start).toEqual({ blockIdx: 0, offset: 1 })
    expect(r?.end).toEqual({ blockIdx: 0, offset: 1 })
  })

  it('non-collapsed range within single text block', () => {
    const root = renderDoc()
    const tn = root.querySelector('[data-block-index="0"]')!.firstChild!
    const sel = root.ownerDocument.getSelection()!
    const range = root.ownerDocument.createRange()
    range.setStart(tn, 0); range.setEnd(tn, 2)
    sel.removeAllRanges(); sel.addRange(range)
    const r = resolveRange(root, sel)
    expect(r?.collapsed).toBe(false)
    expect(r?.start).toEqual({ blockIdx: 0, offset: 0 })
    expect(r?.end).toEqual({ blockIdx: 0, offset: 2 })
  })

  it('returns null when selection outside root', () => {
    const root = renderDoc()
    const outside = root.ownerDocument.createElement('span')
    outside.textContent = 'x'
    root.ownerDocument.body.appendChild(outside)
    const sel = root.ownerDocument.getSelection()!
    const range = root.ownerDocument.createRange()
    range.setStart(outside.firstChild!, 0); range.collapse(true)
    sel.removeAllRanges(); sel.addRange(range)
    expect(resolveRange(root, sel)).toBeNull()
    outside.remove()
  })

  it('null selection / 0 ranges → null', () => {
    const root = renderDoc()
    expect(resolveRange(root, null)).toBeNull()
  })
})
