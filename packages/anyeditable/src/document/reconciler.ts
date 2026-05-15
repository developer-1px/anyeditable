import { useLayoutEffect, type MutableRefObject } from 'react'
import type { DocumentPosition, EditableDocumentBlockAdapter, EditableDocumentMark } from './types.js'
import { restoreDocumentPosition } from './selection.js'

export function useDocumentReconciler<TBlock>(
  containerRef: MutableRefObject<HTMLElement | null>,
  blocks: readonly TBlock[],
  adapter: EditableDocumentBlockAdapter<TBlock>,
  pendingSelection: MutableRefObject<DocumentPosition | null>,
  composing: MutableRefObject<boolean>,
): void {
  useLayoutEffect(() => {
    const root = containerRef.current
    if (!root || composing.current) return
    syncDocument(root, blocks, adapter)
    if (pendingSelection.current) {
      restoreDocumentPosition(root, pendingSelection.current)
      pendingSelection.current = null
    }
  }, [adapter, blocks, composing, containerRef, pendingSelection])
}

export function syncDocument<TBlock>(
  root: HTMLElement,
  blocks: readonly TBlock[],
  adapter: EditableDocumentBlockAdapter<TBlock>,
): void {
  blocks.forEach((block, index) => {
    const el = ensureBlockElement(root, block, index, adapter)
    el.dataset.docBlockIndex = String(index)
    el.dataset.docBlockKind = adapter.getKind(block, index)
    el.dataset.docBlockKey = adapter.getKey?.(block, index) ?? String(index)
    syncInlineContent(el, adapter.getText(block, index), adapter.getMarks?.(block, index) ?? [])
  })
  while (root.children.length > blocks.length) root.removeChild(root.lastChild!)
}

function ensureBlockElement<TBlock>(
  root: HTMLElement,
  block: TBlock,
  index: number,
  adapter: EditableDocumentBlockAdapter<TBlock>,
): HTMLElement {
  const tagName = tagFor(adapter.getKind(block, index), adapter.getHeadingLevel?.(block, index) ?? 2)
  const existing = root.children[index] as HTMLElement | undefined
  if (existing && existing.tagName.toLowerCase() === tagName) return existing
  const el = root.ownerDocument.createElement(tagName)
  if (tagName === 'pre') el.appendChild(root.ownerDocument.createElement('code'))
  if (existing) root.replaceChild(el, existing)
  else root.appendChild(el)
  return el
}

function syncInlineContent(el: HTMLElement, text: string, marks: readonly EditableDocumentMark[]): void {
  const host = el.tagName.toLowerCase() === 'pre'
    ? (el.querySelector('code') ?? el.appendChild(el.ownerDocument.createElement('code')))
    : el
  const signature = JSON.stringify({ text, marks: [...marks].sort(sortMarks) })
  if ((host as HTMLElement).dataset.docInlineSignature === signature) return
  while (host.firstChild) host.removeChild(host.firstChild)
  renderMarkedText(host as HTMLElement, text, marks)
  ;(host as HTMLElement).dataset.docInlineSignature = signature
}

function renderMarkedText(host: HTMLElement, text: string, marks: readonly EditableDocumentMark[]): void {
  if (text.length === 0) {
    host.appendChild(host.ownerDocument.createTextNode(''))
    return
  }
  const boundaries = new Set([0, text.length])
  marks.forEach(mark => {
    boundaries.add(clamp(mark.from, 0, text.length))
    boundaries.add(clamp(mark.to, 0, text.length))
  })
  const points = [...boundaries].sort((a, b) => a - b)
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i]!
    const to = points[i + 1]!
    if (from === to) continue
    const segmentMarks = marks.filter(mark => mark.from <= from && mark.to >= to)
    host.appendChild(wrapSegment(host, text.slice(from, to), segmentMarks))
  }
}

function wrapSegment(host: HTMLElement, text: string, marks: readonly EditableDocumentMark[]): Node {
  let node: Node = host.ownerDocument.createTextNode(text)
  for (const mark of [...marks].sort(sortMarks)) {
    const wrapper = createMarkElement(host, mark)
    wrapper.appendChild(node)
    node = wrapper
  }
  return node
}

function createMarkElement(host: HTMLElement, mark: EditableDocumentMark): HTMLElement {
  const el = host.ownerDocument.createElement(mark.kind === 'link' ? 'a' : 'span')
  el.dataset.docMarkKind = mark.kind
  if (mark.kind === 'link' && mark.href) (el as HTMLAnchorElement).href = mark.href
  if (mark.value) el.dataset.docMarkValue = mark.value
  return el
}

function tagFor(kind: string, level: number): string {
  switch (kind) {
    case 'heading': return `h${clamp(level, 1, 6)}`
    case 'listItem': return 'li'
    case 'callout': return 'blockquote'
    case 'code': return 'pre'
    default: return 'p'
  }
}

function sortMarks(a: EditableDocumentMark, b: EditableDocumentMark): number {
  return a.from - b.from || b.to - a.to || a.kind.localeCompare(b.kind)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

