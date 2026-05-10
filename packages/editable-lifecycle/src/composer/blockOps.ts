import type { JsonPatchOperation } from 'zod-crud'
import type { Block } from './schema.js'

/** F3 자체 조치 — zod-crud `JsonPatchOperation` 어휘 SSOT 채택 */
export type Patch = JsonPatchOperation

/**
 * RFC 6902 패치 — flat blocks array 위 inline-only 변환.
 * caret(blockIdx, offset) 안의 text block 에 텍스트 삽입 → 단일 replace.
 */
export function insertTextPatch(blocks: readonly Block[], blockIdx: number, offset: number, text: string): Patch[] {
  const b = blocks[blockIdx]
  if (!b || b.kind !== 'text') {
    return [{ op: 'add', path: `/blocks/${blockIdx}`, value: { kind: 'text', text } }]
  }
  return [{ op: 'replace', path: `/blocks/${blockIdx}/text`, value: b.text.slice(0, offset) + text + b.text.slice(offset) }]
}

export function deleteBackwardPatch(blocks: readonly Block[], blockIdx: number, offset: number): Patch[] {
  const b = blocks[blockIdx]
  if (!b) return []
  if (b.kind !== 'text') return [{ op: 'remove', path: `/blocks/${blockIdx}` }]
  if (offset <= 0) {
    const prev = blocks[blockIdx - 1]
    if (!prev) return []
    // Removing an atomic between two text blocks merges them; otherwise just drop prev.
    const prevPrev = blocks[blockIdx - 2]
    if (prev.kind !== 'text' && prevPrev?.kind === 'text') {
      return [
        { op: 'replace', path: `/blocks/${blockIdx - 2}/text`, value: prevPrev.text + b.text },
        { op: 'remove', path: `/blocks/${blockIdx}` },
        { op: 'remove', path: `/blocks/${blockIdx - 1}` },
      ]
    }
    return [{ op: 'remove', path: `/blocks/${blockIdx - 1}` }]
  }
  return [{ op: 'replace', path: `/blocks/${blockIdx}/text`, value: b.text.slice(0, offset - 1) + b.text.slice(offset) }]
}

export function deleteForwardPatch(blocks: readonly Block[], blockIdx: number, offset: number): Patch[] {
  const b = blocks[blockIdx]
  if (!b) return []
  if (b.kind !== 'text') return [{ op: 'remove', path: `/blocks/${blockIdx}` }]
  if (offset >= b.text.length) {
    const next = blocks[blockIdx + 1]
    if (!next) return []
    const nextNext = blocks[blockIdx + 2]
    if (next.kind !== 'text' && nextNext?.kind === 'text') {
      return [
        { op: 'replace', path: `/blocks/${blockIdx}/text`, value: b.text + nextNext.text },
        { op: 'remove', path: `/blocks/${blockIdx + 2}` },
        { op: 'remove', path: `/blocks/${blockIdx + 1}` },
      ]
    }
    return [{ op: 'remove', path: `/blocks/${blockIdx + 1}` }]
  }
  return [{ op: 'replace', path: `/blocks/${blockIdx}/text`, value: b.text.slice(0, offset) + b.text.slice(offset + 1) }]
}

export { deleteRangePatch, commitAtomicPatch } from './rangeOps.js'
