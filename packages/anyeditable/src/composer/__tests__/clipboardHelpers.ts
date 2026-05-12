import { useRef } from 'react'
import { vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useClipboard } from '../useClipboard.js'
import type { ComposerDoc } from '../schema.js'

export function setupDoc(): ComposerDoc {
  return { blocks: [{ kind: 'text', text: 'hello' }, { kind: 'mention', id: 'u', label: 'bob' }, { kind: 'text', text: ' world' }] }
}

export function selectRange(root: HTMLElement, startBlock: number, startOffset: number, endBlock: number, endOffset: number) {
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

export function buildRoot(): { root: HTMLElement; doc: ComposerDoc } {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const doc = setupDoc()
  doc.blocks.forEach((b, i) => {
    const span = document.createElement('span')
    span.dataset.blockIndex = String(i)
    span.dataset.blockKind = b.kind
    span.appendChild(document.createTextNode(b.kind === 'text' ? b.text : '@bob'))
    root.appendChild(span)
  })
  return { root, doc }
}

export function mountClipboard(extra: { readOnly?: boolean } = {}): { root: HTMLElement; applied: unknown[] } {
  const { root, doc } = buildRoot()
  const applied: unknown[] = []
  const docRef = extra.readOnly !== undefined
    ? { current: { doc, readOnly: extra.readOnly } }
    : { current: doc }
  const opsRef = { current: { apply: (p: unknown) => { applied.push(p) } } }
  renderHook(() => {
    const elRef = useRef<HTMLElement | null>(root)
    useClipboard(elRef, docRef, opsRef)
  })
  return { root, applied }
}

export function dispatchClipboard(el: HTMLElement, type: 'copy' | 'cut') {
  const evt = new Event(type, { bubbles: true, cancelable: true })
  const writes: Array<[string, string]> = []
  Object.defineProperty(evt, 'clipboardData', { value: { setData: (k: string, v: string) => writes.push([k, v]) } })
  Object.defineProperty(evt, 'type', { value: type })
  const pd = vi.spyOn(evt, 'preventDefault')
  el.dispatchEvent(evt)
  return { writes, pd }
}
