import { describe, it, expect } from 'vitest'
import { docLength, rangeLength, isInsert } from '../limits.js'
import type { Block } from '../schema.js'

const text = (s: string): Block => ({ kind: 'text', text: s })
const mention = (label: string): Block => ({ kind: 'mention', id: 'u1', label })

describe('docLength', () => {
  it('counts text chars + 1 per atomic', () => {
    expect(docLength({ blocks: [text('hi'), mention('bob'), text(' yo')] })).toBe(2 + 1 + 3)
  })
  it('empty doc → 0', () => {
    expect(docLength({ blocks: [] })).toBe(0)
  })
})

describe('rangeLength', () => {
  const doc = { blocks: [text('hello'), mention('bob'), text(' world')] }
  it('same-block text range', () => {
    expect(rangeLength(doc, { startBlock: 0, startOffset: 1, endBlock: 0, endOffset: 4 })).toBe(3)
  })
  it('same-block atomic = 1', () => {
    expect(rangeLength(doc, { startBlock: 1, startOffset: 0, endBlock: 1, endOffset: 0 })).toBe(1)
  })
  it('cross-block: head text tail + atomic middle + head', () => {
    expect(rangeLength(doc, { startBlock: 0, startOffset: 2, endBlock: 2, endOffset: 3 })).toBe(3 + 1 + 3)
  })
  it('cross-block atomic-to-text', () => {
    expect(rangeLength(doc, { startBlock: 1, startOffset: 0, endBlock: 2, endOffset: 2 })).toBe(1 + 2)
  })
})

describe('isInsert', () => {
  it('classifies known insert types', () => {
    expect(isInsert('insertText')).toBe(true)
    expect(isInsert('insertFromPaste')).toBe(true)
    expect(isInsert('insertLineBreak')).toBe(true)
    expect(isInsert('deleteContentBackward')).toBe(false)
  })
})
