import type { JSONPatchOperation } from 'zod-crud'
import type { Block } from './schema.js'

/** F3 자체 조치 — zod-crud `JSONPatchOperation` 어휘 SSOT 채택 */
export type Patch = JSONPatchOperation

/**
 * RFC 6902 패치 — flat blocks array 위 inline-only 변환.
 * caret(blockIdx, offset) 안의 text block 에 텍스트 삽입 → 단일 replace.
 */
export function insertTextPatch(blocks: readonly Block[], blockIdx: number, offset: number, text: string): Patch[] {
  const b = blocks[blockIdx]
  if (!b) return [{ op: 'add', path: `/blocks/${blockIdx}`, value: { kind: 'text', text } }]
  if (b.kind !== 'text') {
    // Caret on atomic chip: offset 0 = before, offset 1 = after. Merge into
    // the adjacent text block on that side; create one if it doesn't exist.
    const afterSide = offset > 0
    const targetIdx = afterSide ? blockIdx + 1 : blockIdx - 1
    const adj = targetIdx >= 0 ? blocks[targetIdx] : undefined
    if (adj?.kind === 'text') {
      const insertAt = afterSide ? 0 : adj.text.length
      return [{ op: 'replace', path: `/blocks/${targetIdx}/text`, value: adj.text.slice(0, insertAt) + text + adj.text.slice(insertAt) }]
    }
    return [{ op: 'add', path: `/blocks/${afterSide ? blockIdx + 1 : blockIdx}`, value: { kind: 'text', text } }]
  }
  return [{ op: 'replace', path: `/blocks/${blockIdx}/text`, value: b.text.slice(0, offset) + text + b.text.slice(offset) }]
}

export function deleteBackwardPatch(blocks: readonly Block[], blockIdx: number, offset: number): Patch[] {
  const b = blocks[blockIdx]
  if (!b) return []
  if (b.kind !== 'text') return removeAtomicMergingFlanks(blocks, blockIdx)
  if (offset <= 0) {
    const prev = blocks[blockIdx - 1]
    if (!prev) return []
    // prev=atomic between text blocks → remove atomic and merge flanking texts.
    if (prev.kind !== 'text') {
      const prevPrev = blocks[blockIdx - 2]
      if (prevPrev?.kind === 'text') {
        return [
          { op: 'replace', path: `/blocks/${blockIdx - 2}/text`, value: prevPrev.text + b.text },
          { op: 'remove', path: `/blocks/${blockIdx}` },
          { op: 'remove', path: `/blocks/${blockIdx - 1}` },
        ]
      }
      return [{ op: 'remove', path: `/blocks/${blockIdx - 1}` }]
    }
    // prev=text (adjacent-text invariant transient): delete last char of prev,
    // not the whole block. Empty prev gets removed.
    if (prev.text.length === 0) return [{ op: 'remove', path: `/blocks/${blockIdx - 1}` }]
    return [{ op: 'replace', path: `/blocks/${blockIdx - 1}/text`, value: prev.text.slice(0, -1) }]
  }
  return [{ op: 'replace', path: `/blocks/${blockIdx}/text`, value: b.text.slice(0, offset - 1) + b.text.slice(offset) }]
}

export function deleteForwardPatch(blocks: readonly Block[], blockIdx: number, offset: number): Patch[] {
  const b = blocks[blockIdx]
  if (!b) return []
  if (b.kind !== 'text') return removeAtomicMergingFlanks(blocks, blockIdx)
  if (offset >= b.text.length) {
    const next = blocks[blockIdx + 1]
    if (!next) return []
    if (next.kind !== 'text') {
      const nextNext = blocks[blockIdx + 2]
      if (nextNext?.kind === 'text') {
        return [
          { op: 'replace', path: `/blocks/${blockIdx}/text`, value: b.text + nextNext.text },
          { op: 'remove', path: `/blocks/${blockIdx + 2}` },
          { op: 'remove', path: `/blocks/${blockIdx + 1}` },
        ]
      }
      return [{ op: 'remove', path: `/blocks/${blockIdx + 1}` }]
    }
    // next=text (adjacent invariant transient): delete first char of next.
    if (next.text.length === 0) return [{ op: 'remove', path: `/blocks/${blockIdx + 1}` }]
    return [{ op: 'replace', path: `/blocks/${blockIdx + 1}/text`, value: next.text.slice(1) }]
  }
  return [{ op: 'replace', path: `/blocks/${blockIdx}/text`, value: b.text.slice(0, offset) + b.text.slice(offset + 1) }]
}

/** Remove atomic at blockIdx; if both flanks are text blocks, merge them. */
function removeAtomicMergingFlanks(blocks: readonly Block[], blockIdx: number): Patch[] {
  const prev = blocks[blockIdx - 1]
  const next = blocks[blockIdx + 1]
  if (prev?.kind === 'text' && next?.kind === 'text') {
    return [
      { op: 'replace', path: `/blocks/${blockIdx - 1}/text`, value: prev.text + next.text },
      { op: 'remove', path: `/blocks/${blockIdx + 1}` },
      { op: 'remove', path: `/blocks/${blockIdx}` },
    ]
  }
  return [{ op: 'remove', path: `/blocks/${blockIdx}` }]
}

export { deleteRangePatch, commitAtomicPatch } from './rangeOps.js'
