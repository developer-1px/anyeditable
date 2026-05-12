import type { ComposerDoc } from './schema.js'
import { deleteBackwardPatch, deleteForwardPatch, deleteRangePatch } from './blockOps.js'
import { rangeDelete, rangeReplace, insertNoRange, type InputResult } from './inputHelpers.js'

export interface BeforeInputCtx {
  doc: ComposerDoc
  caret: { blockIdx: number; offset: number }
  composing: boolean
  range?: { startBlock: number; startOffset: number; endBlock: number; endOffset: number } | null
}

export type BeforeInputResult = InputResult

const WORD_LINE = new Set([
  'deleteWordBackward', 'deleteWordForward',
  'deleteSoftLineBackward', 'deleteSoftLineForward',
  'deleteHardLineBackward', 'deleteHardLineForward',
])

/** Backspace caret: if in middle of text → offset-1; if at text-block start and
 *  prev block exists → land at end of prev text (or just before atomic, which
 *  becomes the new prev after the deleteBackwardPatch removes it). */
function caretAfterBackspace(doc: ComposerDoc, caret: { blockIdx: number; offset: number }) {
  if (caret.offset > 0) return { ...caret, offset: caret.offset - 1 }
  const prev = doc.blocks[caret.blockIdx - 1]
  if (!prev) return caret
  // prev is removed; current block shifts to prev's index.
  const prevPrev = doc.blocks[caret.blockIdx - 2]
  if (prevPrev?.kind === 'text') return { blockIdx: caret.blockIdx - 2, offset: prevPrev.text.length }
  return { blockIdx: caret.blockIdx - 1, offset: 0 }
}

/** WHATWG Input Events L2 inputType 분기. composition 중 ops 보류. */
export function handleBeforeInput(e: InputEvent, ctx: BeforeInputCtx): BeforeInputResult | null {
  if (ctx.composing) return null
  const { caret, doc, range } = ctx
  const same = caret
  const t = e.inputType
  const hasRange = !!(range && !(range.startBlock === range.endBlock && range.startOffset === range.endOffset))
  const rangePatches = hasRange
    ? deleteRangePatch(doc.blocks, range!.startBlock, range!.startOffset, range!.endBlock, range!.endOffset)
    : []
  const afterRange = hasRange ? { blockIdx: range!.startBlock, offset: range!.startOffset } : caret
  const replaceOrInsert = (data: string) => hasRange ? rangeReplace(doc, range!, data) : insertNoRange(doc, caret, data)

  if (t === 'insertText' && typeof e.data === 'string') return replaceOrInsert(e.data)
  if (t === 'insertReplacementText' && typeof e.data === 'string') return replaceOrInsert(e.data)
  if (t === 'insertLineBreak' || t === 'insertParagraph') return replaceOrInsert('\n')
  if (t === 'deleteContentBackward') {
    if (hasRange) return { patches: rangePatches, nextCaret: afterRange, preventDefault: true }
    return {
      patches: deleteBackwardPatch(doc.blocks, caret.blockIdx, caret.offset),
      nextCaret: caretAfterBackspace(doc, caret),
      preventDefault: true,
    }
  }
  if (t === 'deleteContentForward') {
    if (hasRange) return { patches: rangePatches, nextCaret: afterRange, preventDefault: true }
    return { patches: deleteForwardPatch(doc.blocks, caret.blockIdx, caret.offset), nextCaret: same, preventDefault: true }
  }
  if (t === 'deleteByCut' || t === 'deleteByDrag') {
    return { patches: rangePatches, nextCaret: afterRange, preventDefault: true }
  }
  if (WORD_LINE.has(t)) {
    if (hasRange) return { patches: rangePatches, nextCaret: afterRange, preventDefault: true }
    return rangeDelete(doc, caret, t)
  }
  if (t === 'insertFromPaste' || t === 'insertFromDrop') {
    const text = (e as InputEvent & { dataTransfer?: DataTransfer }).dataTransfer?.getData('text/plain') ?? ''
    if (!text) return { patches: [], nextCaret: same, preventDefault: true }
    return replaceOrInsert(text)
  }
  return { patches: [], nextCaret: same, preventDefault: true }
}
