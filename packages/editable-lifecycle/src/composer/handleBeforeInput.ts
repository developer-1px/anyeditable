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
      nextCaret: { ...same, offset: Math.max(0, caret.offset - 1) },
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
