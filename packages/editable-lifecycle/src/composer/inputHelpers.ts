import type { ComposerDoc } from './schema.js'
import { deleteRangePatch, insertTextPatch, type Patch } from './blockOps.js'
import { prevWordBoundary, nextWordBoundary, prevSoftLineBoundary, nextSoftLineBoundary } from './wordOps.js'

export interface InputResult {
  patches: Patch[]
  nextCaret: { blockIdx: number; offset: number }
  preventDefault: boolean
}

export function rangeDelete(
  doc: ComposerDoc,
  caret: { blockIdx: number; offset: number },
  kind: string,
): InputResult {
  const target = kind === 'deleteWordBackward' ? prevWordBoundary(doc.blocks, caret.blockIdx, caret.offset)
    : kind === 'deleteWordForward' ? nextWordBoundary(doc.blocks, caret.blockIdx, caret.offset)
    : kind === 'deleteSoftLineBackward' || kind === 'deleteHardLineBackward' ? prevSoftLineBoundary(doc.blocks, caret.blockIdx, caret.offset)
    : nextSoftLineBoundary(doc.blocks, caret.blockIdx, caret.offset)
  const back = kind.endsWith('Backward')
  const sb = back ? target.blockIdx : caret.blockIdx
  const so = back ? target.offset : caret.offset
  const eb = back ? caret.blockIdx : target.blockIdx
  const eo = back ? caret.offset : target.offset
  if (sb === eb && so === eo) return { patches: [], nextCaret: caret, preventDefault: true }
  return {
    patches: deleteRangePatch(doc.blocks, sb, so, eb, eo),
    nextCaret: { blockIdx: sb, offset: so },
    preventDefault: true,
  }
}

export function insertNoRange(doc: ComposerDoc, caret: { blockIdx: number; offset: number }, data: string): InputResult {
  return {
    patches: insertTextPatch(doc.blocks, caret.blockIdx, caret.offset, data),
    nextCaret: { ...caret, offset: caret.offset + data.length },
    preventDefault: true,
  }
}

export function rangeReplace(
  doc: ComposerDoc,
  range: { startBlock: number; startOffset: number; endBlock: number; endOffset: number },
  data: string,
): InputResult {
  const sb = doc.blocks[range.startBlock]
  const eb = doc.blocks[range.endBlock]
  const startText = sb?.kind === 'text' ? sb.text.slice(0, range.startOffset) : ''
  const endText = eb?.kind === 'text' ? eb.text.slice(range.endOffset) : ''
  const merged = startText + data + endText
  const patches: Patch[] = []
  if (sb?.kind === 'text') patches.push({ op: 'replace', path: `/blocks/${range.startBlock}/text`, value: merged })
  else patches.push({ op: 'replace', path: `/blocks/${range.startBlock}`, value: { kind: 'text', text: merged } })
  for (let i = range.endBlock; i > range.startBlock; i--) patches.push({ op: 'remove', path: `/blocks/${i}` })
  return { patches, nextCaret: { blockIdx: range.startBlock, offset: startText.length + data.length }, preventDefault: true }
}
