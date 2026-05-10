import { useEffect, type MutableRefObject } from 'react'

/**
 * commitAtomic 등 model 변경 직후 DOM caret 을 새 위치로 옮긴다.
 * data-block-index SSOT 위에서 동작 — 호스트가 각 block 에 `blockProps(i)` spread.
 * 매 render 후 pending 이 있으면 시도, 적용 시 clear.
 */
export function usePendingCaret(
  el: MutableRefObject<HTMLElement | null>,
  pending: MutableRefObject<{ blockIdx: number; offset: number } | null>,
): void {
  useEffect(() => {
    const target = pending.current
    const root = el.current
    if (!target || !root) return
    const blockEl = root.querySelector<HTMLElement>(`[data-block-index="${target.blockIdx}"]`)
    if (!blockEl) return
    const sel = root.ownerDocument.getSelection()
    if (!sel) return
    const range = root.ownerDocument.createRange()
    const tn = blockEl.firstChild ?? blockEl
    try {
      range.setStart(tn, target.offset)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    } catch {
      // setStart can throw if offset > childNodes.length; fall back to start of block
      range.setStart(blockEl, 0)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    pending.current = null
  })
}
