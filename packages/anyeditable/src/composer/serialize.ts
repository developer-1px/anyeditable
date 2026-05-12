import type { Block, ComposerDoc } from './schema.js'

/** Block → plain text projection. mentions/commands serialize back to their trigger form. */
export function serializeBlock(b: Block): string {
  if (b.kind === 'text') return b.text
  if (b.kind === 'mention') return '@' + b.label
  return '/' + b.name
}

/** Whole doc → plain text. SSOT for clipboard write + onSubmit payload + analytics. */
export function serialize(doc: ComposerDoc): string {
  return doc.blocks.map(serializeBlock).join('')
}

export interface DocRange {
  startBlock: number; startOffset: number
  endBlock: number; endOffset: number
}

/** Selection range → plain text (cross-block aware). */
export function serializeRange(doc: ComposerDoc, r: DocRange): string {
  const { startBlock: sb, startOffset: so, endBlock: eb, endOffset: eo } = r
  if (sb === eb) {
    const b = doc.blocks[sb]
    if (!b) return ''
    if (b.kind === 'text') return b.text.slice(so, eo)
    return serializeBlock(b)
  }
  const parts: string[] = []
  const head = doc.blocks[sb]
  if (head?.kind === 'text') parts.push(head.text.slice(so))
  else if (head) parts.push(serializeBlock(head))
  for (let i = sb + 1; i < eb; i++) {
    const b = doc.blocks[i]
    if (b) parts.push(serializeBlock(b))
  }
  const tail = doc.blocks[eb]
  if (tail?.kind === 'text') parts.push(tail.text.slice(0, eo))
  else if (tail) parts.push(serializeBlock(tail))
  return parts.join('')
}
