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
    if (b.kind !== 'text') {
      // Removing an atomic between two text blocks merges flanking text.
      const prev = blocks[sb - 1]
      const next = blocks[sb + 1]
      if (prev?.kind === 'text' && next?.kind === 'text') {
        return [
          { op: 'replace', path: `/blocks/${sb - 1}/text`, value: prev.text + next.text },
          { op: 'remove', path: `/blocks/${sb + 1}` },
          { op: 'remove', path: `/blocks/${sb}` },
        ]
      }
      return [{ op: 'remove', path: `/blocks/${sb}` }]
    }
    return [{ op: 'replace', path: `/blocks/${sb}/text`, value: b.text.slice(0, so) + b.text.slice(eo) }]
  }
  const startB = blocks[sb]
  const endB = blocks[eb]
  if (!startB || !endB) return []
  const startText = startB.kind === 'text' ? startB.text.slice(0, so) : ''
  const endText = endB.kind === 'text' ? endB.text.slice(eo) : ''
  // Fold trailing next-text into merged when endB is atomic — otherwise
  // after we remove [sb..eb], blocks[eb+1] (text) would land adjacent to the
  // surviving text at sb. Same with prev-merge on the startB side.
  const next = blocks[eb + 1]
  const foldNext = endB.kind !== 'text' && next?.kind === 'text'
  const prev = blocks[sb - 1]
  const foldPrev = startB.kind !== 'text' && prev?.kind === 'text'
  const tail = foldNext ? (next as { text: string }).text : ''
  const head = foldPrev ? (prev as { text: string }).text : ''
  const merged = head + startText + endText + tail
  const removeUpTo = foldNext ? eb + 1 : eb
  const patches: Patch[] = []
  if (foldPrev) {
    patches.push({ op: 'replace', path: `/blocks/${sb - 1}/text`, value: merged })
    for (let i = removeUpTo; i >= sb; i--) patches.push({ op: 'remove', path: `/blocks/${i}` })
  } else {
    if (startB.kind === 'text') patches.push({ op: 'replace', path: `/blocks/${sb}/text`, value: merged })
    else patches.push({ op: 'replace', path: `/blocks/${sb}`, value: { kind: 'text', text: merged } })
    for (let i = removeUpTo; i > sb; i--) patches.push({ op: 'remove', path: `/blocks/${i}` })
  }
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
