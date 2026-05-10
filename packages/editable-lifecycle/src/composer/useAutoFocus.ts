import { useEffect, type MutableRefObject } from 'react'

/** Focus the element on mount and place caret at the end of its contents. */
export function useAutoFocus(ref: MutableRefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = el.ownerDocument.getSelection()
    if (!sel) return
    const r = el.ownerDocument.createRange()
    r.selectNodeContents(el)
    r.collapse(false)
    sel.removeAllRanges()
    sel.addRange(r)
  }, [ref, enabled])
}
