import { useLayoutEffect, type MutableRefObject } from 'react'
import type { DocumentPosition, EditableDocumentBlockAdapter } from './types.js'
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
    syncInlineContent(el, adapter.getText(block, index))
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

function syncInlineContent(el: HTMLElement, text: string): void {
  const host = el.tagName.toLowerCase() === 'pre'
    ? (el.querySelector('code') ?? el.appendChild(el.ownerDocument.createElement('code')))
    : el
  if ((host as HTMLElement).dataset.docInlineSignature === text) return
  while (host.firstChild) host.removeChild(host.firstChild)
  host.appendChild(host.ownerDocument.createTextNode(text))
  ;(host as HTMLElement).dataset.docInlineSignature = text
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

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}
