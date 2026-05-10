import { useEffect } from 'react'
import { resolveCaret } from './resolveCaret.js'
import { handleBI, handleCE, reEvalTrigger, type DomBridgeRefs, type SetTrigger } from './bridgeHandlers.js'

export type { DomBridgeRefs } from './bridgeHandlers.js'

/** WHATWG Input Events L2 + Selection API native bridge.
 *  IME: composing 동안 ops 보류 → compositionend `event.data` 단발 insertText.
 *  pendingCaret: 매 ops 후 model→DOM caret 복원 트리거 (reconciler 가 소비). */
export function useDomBridge(refs: DomBridgeRefs, setTrigger: SetTrigger): void {
  useEffect(() => {
    const el = refs.el.current
    if (!el) return
    const onBI = (e: Event) => handleBI(e as InputEvent, el, refs, setTrigger)
    const onCS = () => { refs.composing.current = true }
    const onCE = (e: Event) => handleCE(e as CompositionEvent, refs, setTrigger)
    const onSel = () => {
      if (refs.composing.current) return
      const sel = el.ownerDocument.getSelection()
      const pos = resolveCaret(el, sel)
      if (!pos) return
      refs.caret.current = pos
      // Suppress trigger updates while a non-collapsed selection exists —
      // the user is selecting/copying, not authoring a trigger query.
      if (sel && !sel.isCollapsed) return
      reEvalTrigger(refs, setTrigger)
    }
    let blurTimer: ReturnType<typeof setTimeout> | null = null
    const onBlur = () => {
      // Safety: if IME composition is mid-flight when focus is lost, the OS
      // typically commits or cancels, but compositionend isn't guaranteed.
      // Clear the flag so the next focus session isn't stuck pre-empting input.
      refs.composing.current = false
      blurTimer = setTimeout(() => setTrigger(null), 100)
    }
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
