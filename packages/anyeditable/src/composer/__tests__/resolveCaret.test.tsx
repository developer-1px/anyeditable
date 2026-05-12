import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { resolveCaret } from '../resolveCaret.js'

afterEach(() => cleanup())

function setSelection(node: Node, offset: number): Selection {
  const sel = (node.ownerDocument as Document).getSelection()!
  const range = node.ownerDocument!.createRange()
  range.setStart(node, offset)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
  return sel
}

describe('resolveCaret (W3C Selection API → DocPos)', () => {
  it('text block: focusOffset → offset', () => {
    const { container } = render(
      <div data-testid="root">
        <span data-block-index={0} data-block-kind="text">hello</span>
      </div>
    )
    const root = container.firstChild as HTMLElement
    const textNode = root.querySelector('span')!.firstChild!
    const sel = setSelection(textNode, 3)
    expect(resolveCaret(root, sel)).toEqual({ blockIdx: 0, offset: 3 })
  })

  it('returns null when selection is outside root', () => {
    const { container } = render(<div><span data-block-index={0} data-block-kind="text">x</span></div>)
    const outside = document.createElement('div')
    outside.textContent = 'outside'
    document.body.appendChild(outside)
    const sel = setSelection(outside.firstChild!, 0)
    const root = container.firstChild as HTMLElement
    expect(resolveCaret(root, sel)).toBeNull()
    outside.remove()
  })

  it('returns null when no block ancestor found', () => {
    const { container } = render(<div><span>no-marker</span></div>)
    const root = container.firstChild as HTMLElement
    const sel = setSelection(root.querySelector('span')!.firstChild!, 0)
    expect(resolveCaret(root, sel)).toBeNull()
  })

  it('atomic block: caret at left edge → blockIdx (before atomic)', () => {
    const { container } = render(
      <div data-testid="root">
        <span data-block-index={0} data-block-kind="text">hi </span>
        <span data-block-index={1} data-block-kind="mention" contentEditable={false}>@bob</span>
        <span data-block-index={2} data-block-kind="text"> rest</span>
      </div>
    )
    const root = container.firstChild as HTMLElement
    const atomic = root.querySelector('[data-block-index="1"]')!
    const sel = root.ownerDocument.getSelection()!
    const range = root.ownerDocument.createRange()
    // place caret at parent before the atomic node
    range.setStart(root, Array.prototype.indexOf.call(root.childNodes, atomic))
    range.collapse(true)
    sel.removeAllRanges(); sel.addRange(range)
    const pos = resolveCaret(root, sel)
    expect(pos?.blockIdx).toBe(1)
    expect(pos?.offset).toBe(0)
  })

  it('atomic block: caret at right edge → blockIdx+1 (after atomic)', () => {
    const { container } = render(
      <div data-testid="root">
        <span data-block-index={0} data-block-kind="text">hi </span>
        <span data-block-index={1} data-block-kind="mention" contentEditable={false}>@bob</span>
        <span data-block-index={2} data-block-kind="text"> rest</span>
      </div>
    )
    const root = container.firstChild as HTMLElement
    const atomic = root.querySelector('[data-block-index="1"]')!
    const sel = root.ownerDocument.getSelection()!
    const range = root.ownerDocument.createRange()
    range.setStart(root, Array.prototype.indexOf.call(root.childNodes, atomic) + 1)
    range.collapse(true)
    sel.removeAllRanges(); sel.addRange(range)
    const pos = resolveCaret(root, sel)
    expect(pos?.blockIdx).toBe(2)
    expect(pos?.offset).toBe(0)
  })

  it('null selection / 0 ranges → null', () => {
    const { container } = render(<div data-block-index={0} data-block-kind="text">x</div>)
    expect(resolveCaret(container as HTMLElement, null)).toBeNull()
  })
})
