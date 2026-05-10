import type { AtomicKind, ComposerDoc } from './schema.js'
import type { JsonOps } from './useEditableComposer.js'
import type { TriggerHint } from './triggers.js'
import type { CaretPos } from './useDocReconciler.js'
import { detectTrigger } from './triggers.js'
import { handleBeforeInput } from './handleBeforeInput.js'
import { insertTextPatch } from './blockOps.js'
import { resolveCaret } from './resolveCaret.js'
import { resolveRange } from './resolveRange.js'
import { getBlockText, projectText } from './projectText.js'
import { docLength, isInsert, rangeLength } from './limits.js'

export type SetTrigger = (t: (TriggerHint & { blockIdx: number }) | null) => void

export interface DomBridgeRefs {
  el: { current: HTMLElement | null }
  caret: { current: CaretPos }
  pendingCaret: { current: CaretPos | null }
  composing: { current: boolean }
  state: { current: { doc: ComposerDoc; ops: JsonOps; triggers: Record<string, AtomicKind>; minQueryLength: number; readOnly: boolean; maxLength: number | undefined } }
}

/** beforeinput dispatch — caret/range read from live Selection (not cached). */
export function handleBI(ie: InputEvent, el: HTMLElement, refs: DomBridgeRefs, setTrigger: SetTrigger): void {
  const { doc, ops, readOnly, maxLength } = refs.state.current
  if (readOnly) { ie.preventDefault(); return }
  const sel = el.ownerDocument.getSelection()
  const livePos = resolveCaret(el, sel)
  if (livePos) refs.caret.current = livePos
  const dr = resolveRange(el, sel)
  const range = dr && !dr.collapsed
    ? { startBlock: dr.start.blockIdx, startOffset: dr.start.offset, endBlock: dr.end.blockIdx, endOffset: dr.end.offset }
    : null
  const r = handleBeforeInput(ie, { doc, caret: refs.caret.current, composing: refs.composing.current, range })
  if (!r) return
  if (r.preventDefault) ie.preventDefault()
  if (maxLength !== undefined && isInsert(ie.inputType)) {
    const insertLen = insertSize(ie)
    const removeLen = range ? rangeLength(doc, range) : 0
    if (docLength(doc) - removeLen + insertLen > maxLength) return
  }
  if (r.patches.length) {
    ops.apply(r.patches)
    refs.pendingCaret.current = r.nextCaret
  }
  refs.caret.current = r.nextCaret
  pushTrigger(refs, setTrigger, r.nextCaret, projectText(getBlockText(doc, r.nextCaret.blockIdx), ie))
}

/** compositionend — IME 단발 commit 으로 모은 조합 결과 입력. */
export function handleCE(e: CompositionEvent, refs: DomBridgeRefs, setTrigger: SetTrigger): void {
  refs.composing.current = false
  const text = e.data ?? ''
  if (!text) return
  const { doc, ops } = refs.state.current
  const c = refs.caret.current
  ops.apply(insertTextPatch(doc.blocks, c.blockIdx, c.offset, text))
  const next = { ...c, offset: c.offset + text.length }
  refs.caret.current = next
  refs.pendingCaret.current = next
  pushTrigger(refs, setTrigger, next, getBlockText(doc, c.blockIdx) + text)
}

function insertSize(ie: InputEvent): number {
  if (ie.inputType === 'insertLineBreak' || ie.inputType === 'insertParagraph') return 1
  if (ie.inputType === 'insertFromPaste' || ie.inputType === 'insertFromDrop') {
    return (ie as InputEvent & { dataTransfer?: DataTransfer }).dataTransfer?.getData('text/plain').length ?? 0
  }
  return (ie.data ?? '').length
}

function pushTrigger(refs: DomBridgeRefs, setTrigger: SetTrigger, caret: CaretPos, textProjection: string): void {
  const { triggers, minQueryLength } = refs.state.current
  const hint = detectTrigger(textProjection, caret.offset, triggers, minQueryLength)
  setTrigger(hint ? { ...hint, blockIdx: caret.blockIdx } : null)
}
