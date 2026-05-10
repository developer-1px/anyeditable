import { describe, it, expect, vi } from 'vitest'
import { useRef } from 'react'
import { renderHook } from '@testing-library/react'
import { useClipboard } from '../useClipboard.js'
import type { ComposerDoc } from '../schema.js'

function setupDoc(): ComposerDoc {
  return { blocks: [{ kind: 'text', text: 'hello' }, { kind: 'mention', id: 'u', label: 'bob' }, { kind: 'text', text: ' world' }] }
}

function selectRange(root: HTMLElement, startBlock: number, startOffset: number, endBlock: number, endOffset: number) {
  const sb = root.children[startBlock]!
  const eb = root.children[endBlock]!
  const sn = sb.firstChild ?? sb
  const en = eb.firstChild ?? eb
  const sel = document.getSelection()!
  const range = document.createRange()
  range.setStart(sn, startOffset)
  range.setEnd(en, endOffset)
  sel.removeAllRanges()
  sel.addRange(range)
}

function mount() {
  const root = document.createElement('div')
  document.body.appendChild(root)
  // Build a fake DOM matching the reconciler's shape (data-block-index, kind).
  const doc = setupDoc()
  doc.blocks.forEach((b, i) => {
    const span = document.createElement('span')
    span.dataset.blockIndex = String(i)
    span.dataset.blockKind = b.kind
    if (b.kind === 'text') span.appendChild(document.createTextNode(b.text))
    else span.appendChild(document.createTextNode(b.kind === 'mention' ? '@' + b.label : '/' + (b as { name?: string }).name))
    root.appendChild(span)
  })
  const docRef = { current: doc }
  const applied: unknown[] = []
  const opsRef = { current: { apply: (p: unknown) => { applied.push(p) } } }
  renderHook(() => {
    const elRef = useRef<HTMLElement | null>(root)
    useClipboard(elRef, docRef, opsRef)
  })
  return { root, docRef, applied }
}

function dispatchClipboard(el: HTMLElement, type: 'copy' | 'cut') {
  const evt = new Event(type, { bubbles: true, cancelable: true })
  const writes: Array<[string, string]> = []
  Object.defineProperty(evt, 'clipboardData', { value: { setData: (k: string, v: string) => writes.push([k, v]) } })
  Object.defineProperty(evt, 'type', { value: type })
  const pd = vi.spyOn(evt, 'preventDefault')
  el.dispatchEvent(evt)
  return { writes, pd }
}

describe('useClipboard', () => {
  it('copy writes serializeRange to text/plain with chip preserved', () => {
    const { root } = mount()
    selectRange(root, 0, 2, 2, 3) // 'llo' + '@bob' + ' wo'
    const { writes, pd } = dispatchClipboard(root, 'copy')
    expect(pd).toHaveBeenCalled()
    expect(writes).toEqual([['text/plain', 'llo@bob wo']])
  })

  it('cut writes clipboard AND applies range-delete patches', () => {
    const { root, applied } = mount()
    selectRange(root, 0, 0, 2, 6)
    const { writes } = dispatchClipboard(root, 'cut')
    expect(writes[0]?.[1]).toBe('hello@bob world')
    expect(applied.length).toBe(1)
  })

  it('collapsed selection → no clipboard write, no delete', () => {
    const { root, applied } = mount()
    selectRange(root, 0, 1, 0, 1)
    const { writes, pd } = dispatchClipboard(root, 'copy')
    expect(writes).toEqual([])
    expect(pd).not.toHaveBeenCalled()
    expect(applied).toEqual([])
  })
})
