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
