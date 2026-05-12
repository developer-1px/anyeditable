import type { ComposerDoc } from './schema.js'
import type { CaretPos } from './useDocReconciler.js'

/** Clamp caret to a valid (blockIdx, offset) within the current doc. If the
 *  resolved position lands inside an atomic block, normalize to the adjacent
 *  text block's edge so downstream patches operate on text blocks only. */
export function clampCaret(doc: ComposerDoc, c: CaretPos): CaretPos {
  if (doc.blocks.length === 0) return { blockIdx: 0, offset: 0 }
  const blockIdx = Math.min(Math.max(c.blockIdx, 0), doc.blocks.length - 1)
  const b = doc.blocks[blockIdx]!
  if (b.kind !== 'text') {
    const afterSide = c.offset > 0
    const adjIdx = afterSide ? blockIdx + 1 : blockIdx - 1
    const adj = doc.blocks[adjIdx]
    if (adj?.kind === 'text') {
      return { blockIdx: adjIdx, offset: afterSide ? 0 : adj.text.length }
    }
    return { blockIdx, offset: Math.min(Math.max(c.offset, 0), 1) }
  }
  return { blockIdx, offset: Math.min(Math.max(c.offset, 0), b.text.length) }
}

export interface RangePos { startBlock: number; startOffset: number; endBlock: number; endOffset: number }

/** Range clamp — bounds-only (does NOT redirect atomic endpoints to text edges).
 *  A range whose endpoints are on the same atomic block describes "select the
 *  chip itself", which deleteRangePatch removes correctly without expansion. */
export function clampRange(doc: ComposerDoc, r: RangePos): RangePos {
  return {
    startBlock: r.startBlock, startOffset: r.startOffset,
    endBlock: r.endBlock, endOffset: r.endOffset,
    ...clampEndpoint(doc, r.startBlock, r.startOffset, 'start'),
    ...clampEndpoint(doc, r.endBlock, r.endOffset, 'end'),
  }
}

function clampEndpoint(doc: ComposerDoc, blockIdx: number, offset: number, side: 'start' | 'end'): Partial<RangePos> {
  if (doc.blocks.length === 0) return side === 'start' ? { startBlock: 0, startOffset: 0 } : { endBlock: 0, endOffset: 0 }
  const idx = Math.min(Math.max(blockIdx, 0), doc.blocks.length - 1)
  const b = doc.blocks[idx]!
  const max = b.kind === 'text' ? b.text.length : 1
  const off = Math.min(Math.max(offset, 0), max)
  return side === 'start' ? { startBlock: idx, startOffset: off } : { endBlock: idx, endOffset: off }
}

/** Size of an insert (paste / drop / text / linebreak) for maxLength forecasting. */
export function insertSize(ie: InputEvent): number {
  if (ie.inputType === 'insertLineBreak' || ie.inputType === 'insertParagraph') return 1
  if (ie.inputType === 'insertFromPaste' || ie.inputType === 'insertFromDrop') {
    return (ie as InputEvent & { dataTransfer?: DataTransfer }).dataTransfer?.getData('text/plain').length ?? 0
  }
  return (ie.data ?? '').length
}
