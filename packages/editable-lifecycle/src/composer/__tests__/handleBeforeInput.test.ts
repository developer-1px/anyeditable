import { describe, it, expect } from 'vitest'
import { handleBeforeInput } from '../handleBeforeInput.js'
import type { Block } from '../schema.js'

const text = (s: string): Block => ({ kind: 'text', text: s })
const mention = (label: string): Block => ({ kind: 'mention', id: 'u', label })

function ie(inputType: string, data?: string, paste?: string): InputEvent {
  const e: Partial<InputEvent> & { inputType: string; data: string | null; dataTransfer?: DataTransfer } = {
    inputType, data: data ?? null,
  }
  if (paste !== undefined) {
    e.dataTransfer = { getData: () => paste } as unknown as DataTransfer
  }
  return e as InputEvent
}

describe('handleBeforeInput', () => {
  it('composing → null (browser handles natively)', () => {
    const r = handleBeforeInput(ie('insertText', 'a'), {
      doc: { blocks: [text('')] }, caret: { blockIdx: 0, offset: 0 }, composing: true,
    })
    expect(r).toBeNull()
  })

  it('insertText at offset → replace patch + advanced caret', () => {
    const r = handleBeforeInput(ie('insertText', 'X'), {
      doc: { blocks: [text('hi')] }, caret: { blockIdx: 0, offset: 1 }, composing: false,
    })
    expect(r?.patches).toEqual([{ op: 'replace', path: '/blocks/0/text', value: 'hXi' }])
    expect(r?.nextCaret).toEqual({ blockIdx: 0, offset: 2 })
    expect(r?.preventDefault).toBe(true)
  })

  it('insertLineBreak inserts \\n', () => {
    const r = handleBeforeInput(ie('insertLineBreak'), {
      doc: { blocks: [text('ab')] }, caret: { blockIdx: 0, offset: 2 }, composing: false,
    })
    expect(r?.patches).toEqual([{ op: 'replace', path: '/blocks/0/text', value: 'ab\n' }])
  })

  it('deleteContentBackward at offset 0 with atomic prev + text prevPrev → merges', () => {
    const r = handleBeforeInput(ie('deleteContentBackward'), {
      doc: { blocks: [text('hi'), mention('bob'), text('tail')] },
      caret: { blockIdx: 2, offset: 0 }, composing: false,
    })
    expect(r?.patches).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'hitail' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
    expect(r?.nextCaret).toEqual({ blockIdx: 0, offset: 2 })
  })

  it('deleteContentBackward at offset 0 with no prev → no-op caret', () => {
    const r = handleBeforeInput(ie('deleteContentBackward'), {
      doc: { blocks: [text('hi')] }, caret: { blockIdx: 0, offset: 0 }, composing: false,
    })
    expect(r?.patches).toEqual([])
  })

  it('insertText with range → range-replace', () => {
    const r = handleBeforeInput(ie('insertText', 'Z'), {
      doc: { blocks: [text('abcdef')] }, caret: { blockIdx: 0, offset: 5 }, composing: false,
      range: { startBlock: 0, startOffset: 1, endBlock: 0, endOffset: 4 },
    })
    expect(r?.patches).toEqual([{ op: 'replace', path: '/blocks/0/text', value: 'aZef' }])
    expect(r?.nextCaret).toEqual({ blockIdx: 0, offset: 2 })
  })

  it('insertFromPaste with no dataTransfer text → no-op', () => {
    const r = handleBeforeInput(ie('insertFromPaste', undefined, ''), {
      doc: { blocks: [text('hi')] }, caret: { blockIdx: 0, offset: 2 }, composing: false,
    })
    expect(r?.patches).toEqual([])
    expect(r?.preventDefault).toBe(true)
  })

  it('insertFromPaste inserts dataTransfer text/plain', () => {
    const r = handleBeforeInput(ie('insertFromPaste', undefined, 'YZ'), {
      doc: { blocks: [text('hi')] }, caret: { blockIdx: 0, offset: 1 }, composing: false,
    })
    expect(r?.patches).toEqual([{ op: 'replace', path: '/blocks/0/text', value: 'hYZi' }])
  })

  it('unknown inputType → preventDefault only', () => {
    const r = handleBeforeInput(ie('formatBold'), {
      doc: { blocks: [text('hi')] }, caret: { blockIdx: 0, offset: 1 }, composing: false,
    })
    expect(r?.patches).toEqual([])
    expect(r?.preventDefault).toBe(true)
  })
})
