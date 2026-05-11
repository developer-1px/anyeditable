import { describe, it, expect } from 'vitest'
import { clampCaret, clampRange, insertSize } from '../caretClamp.js'
import type { ComposerDoc } from '../schema.js'

const doc = (...texts: string[]): ComposerDoc => ({
  blocks: texts.map(t => ({ kind: 'text', text: t })),
})

describe('clampCaret', () => {
  it('empty doc → {0, 0}', () => {
    expect(clampCaret({ blocks: [] }, { blockIdx: 5, offset: 10 })).toEqual({ blockIdx: 0, offset: 0 })
  })
  it('blockIdx past end → last block, offset clamped to text length', () => {
    expect(clampCaret(doc('hi', 'world'), { blockIdx: 9, offset: 99 })).toEqual({ blockIdx: 1, offset: 5 })
  })
  it('negative caret → {0, 0}', () => {
    expect(clampCaret(doc('hi'), { blockIdx: -3, offset: -10 })).toEqual({ blockIdx: 0, offset: 0 })
  })
  it('valid caret pass-through', () => {
    expect(clampCaret(doc('hello'), { blockIdx: 0, offset: 3 })).toEqual({ blockIdx: 0, offset: 3 })
  })
  it('lone atomic clamps offset to [0,1]', () => {
    const d: ComposerDoc = { blocks: [{ kind: 'mention', id: 'u', label: 'x' }] }
    expect(clampCaret(d, { blockIdx: 0, offset: 9 })).toEqual({ blockIdx: 0, offset: 1 })
  })
  it('atomic with adjacent text after → moves caret to start of next text', () => {
    const d: ComposerDoc = { blocks: [{ kind: 'text', text: 'hi' }, { kind: 'mention', id: 'u', label: 'x' }, { kind: 'text', text: 'tail' }] }
    expect(clampCaret(d, { blockIdx: 1, offset: 1 })).toEqual({ blockIdx: 2, offset: 0 })
  })
  it('atomic with adjacent text before → moves caret to end of prev text', () => {
    const d: ComposerDoc = { blocks: [{ kind: 'text', text: 'hi' }, { kind: 'mention', id: 'u', label: 'x' }, { kind: 'text', text: 'tail' }] }
    expect(clampCaret(d, { blockIdx: 1, offset: 0 })).toEqual({ blockIdx: 0, offset: 2 })
  })
})

describe('clampRange', () => {
  it('clamps both endpoints', () => {
    expect(clampRange(doc('hi', 'world'), { startBlock: -1, startOffset: -1, endBlock: 99, endOffset: 99 })).toEqual({
      startBlock: 0, startOffset: 0, endBlock: 1, endOffset: 5,
    })
  })
  it('preserves chip-selection range — does NOT redirect atomic endpoints to text', () => {
    const d: ComposerDoc = { blocks: [{ kind: 'text', text: 'hi' }, { kind: 'mention', id: 'u', label: 'x' }, { kind: 'text', text: 'tail' }] }
    expect(clampRange(d, { startBlock: 1, startOffset: 0, endBlock: 1, endOffset: 1 })).toEqual({
      startBlock: 1, startOffset: 0, endBlock: 1, endOffset: 1,
    })
  })
})

describe('insertSize', () => {
  const make = (over: Partial<InputEvent> & { inputType: string }) => over as unknown as InputEvent
  it('text insert returns data length', () => {
    expect(insertSize(make({ inputType: 'insertText', data: 'XY' }))).toBe(2)
  })
  it('linebreak is 1 char', () => {
    expect(insertSize(make({ inputType: 'insertLineBreak' }))).toBe(1)
  })
  it('paste reads dataTransfer text/plain length', () => {
    const ie = make({ inputType: 'insertFromPaste' }) as InputEvent & { dataTransfer?: DataTransfer }
    Object.defineProperty(ie, 'dataTransfer', { value: { getData: () => 'hello' } })
    expect(insertSize(ie)).toBe(5)
  })
})
