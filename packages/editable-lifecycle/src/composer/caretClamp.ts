import type { ComposerDoc } from './schema.js'
import type { CaretPos } from './useDocReconciler.js'

/** Clamp caret to a valid (blockIdx, offset) within the current doc.
 *  Defensive: doc may shrink via external undo / load / etc. without a
 *  selectionchange landing a fresh live caret position. */
export function clampCaret(doc: ComposerDoc, c: CaretPos): CaretPos {
  if (doc.blocks.length === 0) return { blockIdx: 0, offset: 0 }
  const blockIdx = Math.min(Math.max(c.blockIdx, 0), doc.blocks.length - 1)
  const b = doc.blocks[blockIdx]!
  const maxOffset = b.kind === 'text' ? b.text.length : 1
  return { blockIdx, offset: Math.min(Math.max(c.offset, 0), maxOffset) }
}

/** Size of an insert (paste / drop / text / linebreak) for maxLength forecasting. */
export function insertSize(ie: InputEvent): number {
  if (ie.inputType === 'insertLineBreak' || ie.inputType === 'insertParagraph') return 1
  if (ie.inputType === 'insertFromPaste' || ie.inputType === 'insertFromDrop') {
    return (ie as InputEvent & { dataTransfer?: DataTransfer }).dataTransfer?.getData('text/plain').length ?? 0
  }
  return (ie.data ?? '').length
}
