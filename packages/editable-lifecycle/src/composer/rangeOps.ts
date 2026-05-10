import type { Patch } from './blockOps.js'
import type { Block } from './schema.js'

/** Selection range 삭제 — single + cross-block (atomic 포함). caret 은 startBlock/startText.length 로. */
export function deleteRangePatch(
  blocks: readonly Block[],
  sb: number, so: number,
  eb: number, eo: number,
): Patch[] {
  if (sb === eb) {
    const b = blocks[sb]
    if (!b) return []
    if (b.kind !== 'text') return [{ op: 'remove', path: `/blocks/${sb}` }]
    return [{ op: 'replace', path: `/blocks/${sb}/text`, value: b.text.slice(0, so) + b.text.slice(eo) }]
  }
  const startB = blocks[sb]
  const endB = blocks[eb]
  if (!startB || !endB) return []
  const startText = startB.kind === 'text' ? startB.text.slice(0, so) : ''
  const endText = endB.kind === 'text' ? endB.text.slice(eo) : ''
  const merged = startText + endText
  const patches: Patch[] = []
  if (startB.kind === 'text') patches.push({ op: 'replace', path: `/blocks/${sb}/text`, value: merged })
  else patches.push({ op: 'replace', path: `/blocks/${sb}`, value: { kind: 'text', text: merged } })
  for (let i = eb; i > sb; i--) patches.push({ op: 'remove', path: `/blocks/${i}` })
  return patches
}

/** trigger 문자부터 cursor 까지 지우고 atomic 삽입. text block split 포함. */
export function commitAtomicPatch(
  blocks: readonly Block[],
  blockIdx: number,
  triggerStart: number,
  cursor: number,
  atomic: Block,
): Patch[] {
  const b = blocks[blockIdx]
  if (!b || b.kind !== 'text') return []
  return [
    { op: 'replace', path: `/blocks/${blockIdx}/text`, value: b.text.slice(0, triggerStart) },
    { op: 'add', path: `/blocks/${blockIdx + 1}`, value: atomic },
    { op: 'add', path: `/blocks/${blockIdx + 2}`, value: { kind: 'text', text: b.text.slice(cursor) } },
  ]
}
