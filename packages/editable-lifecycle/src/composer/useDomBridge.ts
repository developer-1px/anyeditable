import { useEffect, type MutableRefObject } from 'react'
import type { AtomicKind, ComposerDoc } from './schema.js'
import type { JsonOps } from './useEditableComposer.js'
import type { TriggerHint } from './triggers.js'
import { detectTrigger } from './triggers.js'
import { handleBeforeInput } from './handleBeforeInput.js'
import { insertTextPatch } from './blockOps.js'
import { resolveCaret } from './resolveCaret.js'
import { resolveRange } from './resolveRange.js'
import { getBlockText, projectText } from './projectText.js'

export interface DomBridgeRefs {
  el: MutableRefObject<HTMLElement | null>
  caret: MutableRefObject<{ blockIdx: number; offset: number }>
  composing: MutableRefObject<boolean>
  state: MutableRefObject<{ doc: ComposerDoc; ops: JsonOps; triggers: Record<string, AtomicKind>; minQueryLength: number }>
}

type SetTrigger = (t: (TriggerHint & { blockIdx: number }) | null) => void

/** WHATWG Input Events L2 + Selection API native listener bridge.
 *  IME composition: 동안 ops 보류 → compositionend `event.data` 로 단발 insertText.
 *  blur: 100ms delay 후 trigger cancel (option mouseDown 이 먼저 fire 될 시간 확보). */
export function useDomBridge(refs: DomBridgeRefs, setTrigger: SetTrigger): void {
  useEffect(() => {
    const el = refs.el.current
    if (!el) return
    const onBI = (e: Event) => {
      const ie = e as InputEvent
      const { doc, ops } = refs.state.current
      const sel = el.ownerDocument.getSelection()
      const dr = resolveRange(el, sel)
      const range = dr && !dr.collapsed
        ? { startBlock: dr.start.blockIdx, startOffset: dr.start.offset, endBlock: dr.end.blockIdx, endOffset: dr.end.offset }
        : null
      const r = handleBeforeInput(ie, { doc, caret: refs.caret.current, composing: refs.composing.current, range })
      if (!r) return
      if (r.preventDefault) ie.preventDefault()
      if (r.patches.length) ops.apply(r.patches)
      refs.caret.current = r.nextCaret
      pushTrigger(refs, setTrigger, r.nextCaret, projectText(getBlockText(doc, r.nextCaret.blockIdx), ie))
    }
    const onCS = () => { refs.composing.current = true }
    const onCE = (e: Event) => {
      refs.composing.current = false
      const text = (e as CompositionEvent).data ?? ''
      if (!text) return
      const { doc, ops } = refs.state.current
      const c = refs.caret.current
      ops.apply(insertTextPatch(doc.blocks, c.blockIdx, c.offset, text))
      const next = { ...c, offset: c.offset + text.length }
      refs.caret.current = next
      pushTrigger(refs, setTrigger, next, getBlockText(doc, c.blockIdx) + text)
    }
    const onSel = () => {
      if (refs.composing.current) return
      const pos = resolveCaret(el, el.ownerDocument.getSelection())
      if (pos) refs.caret.current = pos
    }
    let blurTimer: ReturnType<typeof setTimeout> | null = null
    const onBlur = () => { blurTimer = setTimeout(() => setTrigger(null), 100) }
    const onFocus = () => { if (blurTimer !== null) { clearTimeout(blurTimer); blurTimer = null } }
    el.addEventListener('beforeinput', onBI)
    el.addEventListener('compositionstart', onCS)
    el.addEventListener('compositionend', onCE)
    el.addEventListener('blur', onBlur)
    el.addEventListener('focus', onFocus)
    el.ownerDocument.addEventListener('selectionchange', onSel)
    return () => {
      if (blurTimer !== null) clearTimeout(blurTimer)
      el.removeEventListener('beforeinput', onBI)
      el.removeEventListener('compositionstart', onCS)
      el.removeEventListener('compositionend', onCE)
      el.removeEventListener('blur', onBlur)
      el.removeEventListener('focus', onFocus)
      el.ownerDocument.removeEventListener('selectionchange', onSel)
    }
  }, [refs, setTrigger])
}

function pushTrigger(
  refs: DomBridgeRefs,
  setTrigger: SetTrigger,
  caret: { blockIdx: number; offset: number },
  textProjection: string,
): void {
  const { triggers, minQueryLength } = refs.state.current
  const hint = detectTrigger(textProjection, caret.offset, triggers, minQueryLength)
  setTrigger(hint ? { ...hint, blockIdx: caret.blockIdx } : null)
}
