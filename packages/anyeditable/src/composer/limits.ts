import type { ComposerDoc } from './schema.js'

/** Total countable length: text chars + 1 per atomic block. */
export function docLength(doc: ComposerDoc): number {
  let n = 0
  for (const b of doc.blocks) n += b.kind === 'text' ? b.text.length : 1
  return n
}

const INSERT_TYPES = new Set([
  'insertText', 'insertReplacementText',
  'insertLineBreak', 'insertParagraph',
  'insertFromPaste', 'insertFromDrop',
])

export function isInsert(inputType: string): boolean {
  return INSERT_TYPES.has(inputType)
}

/** Counted length of a contiguous range. Used for maxLength forecasting. */
export function rangeLength(
  doc: ComposerDoc,
  r: { startBlock: number; startOffset: number; endBlock: number; endOffset: number },
): number {
  if (r.startBlock === r.endBlock) {
    const b = doc.blocks[r.startBlock]
    if (!b) return 0
    return b.kind === 'text' ? r.endOffset - r.startOffset : 1
  }
  let n = 0
  for (let i = r.startBlock; i <= r.endBlock; i++) {
    const b = doc.blocks[i]
    if (!b) continue
    if (b.kind !== 'text') { n += 1; continue }
    if (i === r.startBlock) n += b.text.length - r.startOffset
    else if (i === r.endBlock) n += r.endOffset
    else n += b.text.length
  }
  return n
}
