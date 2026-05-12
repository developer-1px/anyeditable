import { resolveNodeOffset, type DocPos } from './resolveCaret.js'

export interface DocRange {
  start: DocPos
  end: DocPos
  collapsed: boolean
}

/**
 * W3C Selection API → DocRange. anchor↔focus 순서를 doc-order 로 정규화.
 * 같은 block 안에서는 offset 비교, 다른 block 간에는 blockIdx 비교.
 */
export function resolveRange(root: HTMLElement, selection: Selection | null): DocRange | null {
  if (!selection || selection.rangeCount === 0) return null
  const anchor = selection.anchorNode && root.contains(selection.anchorNode)
    ? resolveNodeOffset(root, selection.anchorNode, selection.anchorOffset)
    : null
  const focus = selection.focusNode && root.contains(selection.focusNode)
    ? resolveNodeOffset(root, selection.focusNode, selection.focusOffset)
    : null
  if (!anchor || !focus) return null
  const [start, end] = order(anchor, focus)
  const collapsed = start.blockIdx === end.blockIdx && start.offset === end.offset
  return { start, end, collapsed }
}

function order(a: DocPos, b: DocPos): [DocPos, DocPos] {
  if (a.blockIdx < b.blockIdx) return [a, b]
  if (a.blockIdx > b.blockIdx) return [b, a]
  return a.offset <= b.offset ? [a, b] : [b, a]
}
