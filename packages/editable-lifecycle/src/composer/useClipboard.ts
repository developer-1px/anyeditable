import { useEffect, type MutableRefObject } from 'react'
import type { ComposerDoc } from './schema.js'
import { resolveRange } from './resolveRange.js'
import { serializeRange } from './serialize.js'

/** copy/cut handler — writes serializeRange (atomic-aware plain text) into clipboardData.
 *  Browser default copy on contenteditable would emit the rendered span text only;
 *  atomics ('@bob' chip) need their structured form preserved. */
export function useClipboard(
  elRef: MutableRefObject<HTMLElement | null>,
  docRef: MutableRefObject<ComposerDoc>,
): void {
  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const handler = (e: ClipboardEvent) => {
      if (!e.clipboardData) return
      const sel = el.ownerDocument.getSelection()
      const dr = resolveRange(el, sel)
      if (!dr || dr.collapsed) return
      const text = serializeRange(docRef.current, {
        startBlock: dr.start.blockIdx, startOffset: dr.start.offset,
        endBlock: dr.end.blockIdx, endOffset: dr.end.offset,
      })
      e.clipboardData.setData('text/plain', text)
      e.preventDefault()
    }
    el.addEventListener('copy', handler as EventListener)
    el.addEventListener('cut', handler as EventListener)
    return () => {
      el.removeEventListener('copy', handler as EventListener)
      el.removeEventListener('cut', handler as EventListener)
    }
  }, [elRef, docRef])
}
