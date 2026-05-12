import { useLayoutEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Block, ComposerDoc } from './schema.js'

export interface CaretPos { blockIdx: number; offset: number }

/** Lexical-concept self DOM reconciler. React owns only the container ref;
 *  text nodes are mutated in-place via `nodeValue` to preserve native IME
 *  composition context. Atomics render via createPortal (DecoratorNode-eq). */
export function useDocReconciler(
  containerRef: MutableRefObject<HTMLElement | null>,
  doc: ComposerDoc,
  renderAtomic: ((block: Block) => ReactNode) | undefined,
  pendingCaret: MutableRefObject<CaretPos | null>,
): ReactNode[] {
  const [portals, setPortals] = useState<ReactNode[]>([])
  const renderRef = useRef(renderAtomic)
  renderRef.current = renderAtomic
  useLayoutEffect(() => {
    const root = containerRef.current
    if (!root) return
    const next = syncBlocks(root, doc.blocks, renderRef.current)
    // Skip setState when no atomic blocks — avoids a useless re-render per
    // text keystroke. (Text blocks mutate DOM directly; only atomic portals
    // need React reconciliation.)
    setPortals(prev => (prev.length === 0 && next.length === 0 ? prev : next))
    if (pendingCaret.current) {
      restoreCaret(root, pendingCaret.current)
      pendingCaret.current = null
    }
  }, [doc, containerRef, pendingCaret])
  return portals
}

function syncBlocks(
  root: HTMLElement,
  blocks: readonly Block[],
  renderAtomic: ((b: Block) => ReactNode) | undefined,
): ReactNode[] {
  const portals: ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!
    const el = ensureBlockEl(root, i, b)
    el.dataset.blockIndex = String(i)
    if (b.kind === 'text') {
      syncText(el, b.text)
    } else {
      const display = b.kind === 'mention' ? '@' + b.label : '/' + b.name
      el.setAttribute('aria-label', display)
      if (renderAtomic) portals.push(createPortal(renderAtomic(b), el, `b${i}`))
      else syncText(el, display)
    }
  }
  while (root.children.length > blocks.length) root.removeChild(root.lastChild!)
  return portals
}

function ensureBlockEl(root: HTMLElement, i: number, b: Block): HTMLElement {
  const existing = root.children[i] as HTMLElement | undefined
  if (existing && existing.dataset.blockKind === b.kind) return existing
  const span = root.ownerDocument.createElement('span')
  span.dataset.blockKind = b.kind
  if (b.kind !== 'text') span.contentEditable = 'false'
  if (existing) root.replaceChild(span, existing)
  else root.appendChild(span)
  return span
}

function syncText(el: HTMLElement, text: string): void {
  if (text === '') {
    while (el.firstChild) el.removeChild(el.firstChild)
    return
  }
  const tn = el.firstChild
  if (tn && tn.nodeType === 3) {
    if (tn.nodeValue !== text) tn.nodeValue = text
  } else {
    el.textContent = text
  }
}

function restoreCaret(root: HTMLElement, pos: CaretPos): void {
  const block = root.querySelector(`[data-block-index="${pos.blockIdx}"]`) as HTMLElement | null
  const sel = root.ownerDocument.getSelection()
  if (!sel) return
  const range = root.ownerDocument.createRange()
  if (!block) {
    range.setStart(root, Math.min(pos.blockIdx, root.childNodes.length))
  } else {
    const tn = block.firstChild
    if (tn && tn.nodeType === 3) range.setStart(tn, Math.min(pos.offset, (tn.nodeValue ?? '').length))
    else range.setStart(block, 0)
  }
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}
