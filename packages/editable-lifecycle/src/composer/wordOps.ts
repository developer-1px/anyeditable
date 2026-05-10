import type { Block } from './schema.js'

/** Unicode-aware word boundary scan within a single text block, then atomic-aware step across blocks. */
export function prevWordBoundary(blocks: readonly Block[], blockIdx: number, offset: number): { blockIdx: number; offset: number } {
  const b = blocks[blockIdx]
  if (!b) return { blockIdx, offset }
  if (b.kind !== 'text') return { blockIdx, offset }
  if (offset <= 0) {
    if (blockIdx === 0) return { blockIdx, offset }
    const prev = blocks[blockIdx - 1]
    if (!prev) return { blockIdx, offset }
    return prev.kind === 'text'
      ? { blockIdx: blockIdx - 1, offset: prev.text.length }
      : { blockIdx: blockIdx - 1, offset: 0 }
  }
  const text = b.text.slice(0, offset)
  const m = text.match(/[\p{L}\p{N}_]+\s*$|\s+$|.$/u)
  const cut = m ? offset - m[0].length : 0
  return { blockIdx, offset: cut }
}

export function nextWordBoundary(blocks: readonly Block[], blockIdx: number, offset: number): { blockIdx: number; offset: number } {
  const b = blocks[blockIdx]
  if (!b) return { blockIdx, offset }
  if (b.kind !== 'text') return { blockIdx, offset }
  if (offset >= b.text.length) {
    const next = blocks[blockIdx + 1]
    if (!next) return { blockIdx, offset }
    return { blockIdx: blockIdx + 1, offset: 0 }
  }
  const rest = b.text.slice(offset)
  const m = rest.match(/^\s+|^[\p{L}\p{N}_]+|^./u)
  const len = m ? m[0].length : 1
  return { blockIdx, offset: offset + len }
}

/** Soft line: previous \n inside current text block, or block start. */
export function prevSoftLineBoundary(blocks: readonly Block[], blockIdx: number, offset: number): { blockIdx: number; offset: number } {
  const b = blocks[blockIdx]
  if (!b || b.kind !== 'text') return { blockIdx, offset }
  const before = b.text.slice(0, offset)
  const nl = before.lastIndexOf('\n')
  return { blockIdx, offset: nl < 0 ? 0 : nl + 1 }
}

export function nextSoftLineBoundary(blocks: readonly Block[], blockIdx: number, offset: number): { blockIdx: number; offset: number } {
  const b = blocks[blockIdx]
  if (!b || b.kind !== 'text') return { blockIdx, offset }
  const rest = b.text.slice(offset)
  const nl = rest.indexOf('\n')
  return { blockIdx, offset: nl < 0 ? b.text.length : offset + nl }
}
