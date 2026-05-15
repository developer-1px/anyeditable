import type { DocumentPosition, DocumentRange } from './types.js'

export function resolveDocumentPosition(root: HTMLElement, node: Node, nodeOffset: number): DocumentPosition | null {
  const block = findBlock(root, node)
  if (!block) return null
  const blockIndex = Number(block.dataset.docBlockIndex)
  if (!Number.isFinite(blockIndex)) return null
  return { blockIndex, offset: offsetInBlock(block, node, nodeOffset) }
}

export function resolveDocumentRange(root: HTMLElement): DocumentRange | null {
  const sel = root.ownerDocument.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const anchor = resolveDocumentPosition(root, sel.anchorNode ?? root, sel.anchorOffset)
  const focus = resolveDocumentPosition(root, sel.focusNode ?? root, sel.focusOffset)
  return anchor && focus ? { anchor, focus } : null
}

export function restoreDocumentPosition(root: HTMLElement, position: DocumentPosition): void {
  const block = root.querySelector(`[data-doc-block-index="${position.blockIndex}"]`) as HTMLElement | null
  const sel = root.ownerDocument.getSelection()
  if (!block || !sel) return
  const target = textNodeAtOffset(block, position.offset)
  const range = root.ownerDocument.createRange()
  range.setStart(target.node, target.offset)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

export function comparePositions(a: DocumentPosition, b: DocumentPosition): number {
  return a.blockIndex - b.blockIndex || a.offset - b.offset
}

export function orderedRange(range: DocumentRange): { start: DocumentPosition; end: DocumentPosition } {
  return comparePositions(range.anchor, range.focus) <= 0
    ? { start: range.anchor, end: range.focus }
    : { start: range.focus, end: range.anchor }
}

function findBlock(root: HTMLElement, node: Node): HTMLElement | null {
  const start = node.nodeType === 1 ? node as Element : node.parentElement
  const block = start?.closest?.('[data-doc-block-index]') as HTMLElement | null
  return block && root.contains(block) ? block : null
}

function offsetInBlock(block: HTMLElement, node: Node, nodeOffset: number): number {
  let offset = 0
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current) {
    const text = current.nodeValue ?? ''
    if (current === node) return offset + Math.min(nodeOffset, text.length)
    offset += text.length
    current = walker.nextNode()
  }
  return offset
}

function textNodeAtOffset(block: HTMLElement, targetOffset: number): { node: Node; offset: number } {
  let seen = 0
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current) {
    const text = current.nodeValue ?? ''
    const next = seen + text.length
    if (targetOffset <= next) return { node: current, offset: Math.max(0, targetOffset - seen) }
    seen = next
    current = walker.nextNode()
  }
  if (!block.firstChild) block.appendChild(block.ownerDocument.createTextNode(''))
  return { node: block.firstChild!, offset: 0 }
}

