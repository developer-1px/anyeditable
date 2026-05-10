import { useEffect, type MutableRefObject } from 'react'
import type { ComposerDoc } from './schema.js'
import type { JsonOps } from './useEditableComposer.js'
import { resolveRange } from './resolveRange.js'
import { serializeRange } from './serialize.js'
import { deleteRangePatch } from './blockOps.js'

/** copy/cut handler — writes serializeRange (atomic-aware plain text) into clipboardData.
 *  Browser default copy on contenteditable would emit only rendered span text;
 *  atomic chips need their structured trigger form preserved.
 *  cut: clipboard write + manual range delete via ops (preventDefault blocks
 *  the browser's default delete, so we issue the patch ourselves). */
export function useClipboard(
  elRef: MutableRefObject<HTMLElement | null>,
  docRef: MutableRefObject<ComposerDoc>,
  opsRef: MutableRefObject<JsonOps>,
): void {
  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const handler = (e: ClipboardEvent) => {
      if (!e.clipboardData) return
      const sel = el.ownerDocument.getSelection()
      const dr = resolveRange(el, sel)
      if (!dr || dr.collapsed) return
      const r = { startBlock: dr.start.blockIdx, startOffset: dr.start.offset, endBlock: dr.end.blockIdx, endOffset: dr.end.offset }
      e.clipboardData.setData('text/plain', serializeRange(docRef.current, r))
      e.preventDefault()
      if (e.type === 'cut') {
        opsRef.current.apply(deleteRangePatch(docRef.current.blocks, r.startBlock, r.startOffset, r.endBlock, r.endOffset))
      }
    }
    el.addEventListener('copy', handler as EventListener)
    el.addEventListener('cut', handler as EventListener)
    return () => {
      el.removeEventListener('copy', handler as EventListener)
      el.removeEventListener('cut', handler as EventListener)
    }
  }, [elRef, docRef, opsRef])
}
