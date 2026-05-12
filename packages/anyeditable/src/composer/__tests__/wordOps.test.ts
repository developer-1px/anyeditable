import { describe, it, expect } from 'vitest'
import { handleBeforeInput } from '../handleBeforeInput.js'
import type { ComposerDoc } from '../schema.js'

const doc = (text: string): ComposerDoc => ({ blocks: [{ kind: 'text', text }] })

const fire = (inputType: string, ctx: Parameters<typeof handleBeforeInput>[1]) =>
  handleBeforeInput({ inputType, data: null } as unknown as InputEvent, ctx)

describe('word/line delete inputTypes (WHATWG Input Events L2)', () => {
  it('deleteWordBackward removes the previous word', () => {
    const r = fire('deleteWordBackward', { doc: doc('hello world'), caret: { blockIdx: 0, offset: 11 }, composing: false })!
    expect(r.patches).toEqual([{ op: 'replace', path: '/blocks/0/text', value: 'hello ' }])
    expect(r.nextCaret).toEqual({ blockIdx: 0, offset: 6 })
  })

  it('deleteWordBackward consumes trailing whitespace + word together (macOS Alt+Backspace)', () => {
    const r = fire('deleteWordBackward', { doc: doc('hello   '), caret: { blockIdx: 0, offset: 8 }, composing: false })!
    expect(r.patches).toEqual([{ op: 'replace', path: '/blocks/0/text', value: '' }])
  })

  it('deleteWordForward removes the next word', () => {
    const r = fire('deleteWordForward', { doc: doc('hello world'), caret: { blockIdx: 0, offset: 0 }, composing: false })!
    expect(r.patches).toEqual([{ op: 'replace', path: '/blocks/0/text', value: ' world' }])
    expect(r.nextCaret).toEqual({ blockIdx: 0, offset: 0 })
  })

  it('deleteSoftLineBackward removes from line start to caret', () => {
    const r = fire('deleteSoftLineBackward', { doc: doc('first\nsecond line'), caret: { blockIdx: 0, offset: 17 }, composing: false })!
    expect(r.patches).toEqual([{ op: 'replace', path: '/blocks/0/text', value: 'first\n' }])
    expect(r.nextCaret).toEqual({ blockIdx: 0, offset: 6 })
  })

  it('deleteSoftLineForward removes from caret to next newline', () => {
    const r = fire('deleteSoftLineForward', { doc: doc('first\nsecond'), caret: { blockIdx: 0, offset: 0 }, composing: false })!
    expect(r.patches).toEqual([{ op: 'replace', path: '/blocks/0/text', value: '\nsecond' }])
  })

  it('insertReplacementText replaces selection (autocorrect)', () => {
    const r = handleBeforeInput(
      { inputType: 'insertReplacementText', data: 'corrected' } as unknown as InputEvent,
      { doc: doc('teh quick'), caret: { blockIdx: 0, offset: 0 }, composing: false, range: { startBlock: 0, startOffset: 0, endBlock: 0, endOffset: 3 } },
    )!
    expect(r.patches).toEqual([{ op: 'replace', path: '/blocks/0/text', value: 'corrected quick' }])
  })

  it('deleteWordBackward at offset 0 crosses into previous text block', () => {
    const d: ComposerDoc = { blocks: [{ kind: 'text', text: 'hello' }, { kind: 'mention', id: 'a', label: 'A' }, { kind: 'text', text: 'world' }] }
    const r = fire('deleteWordBackward', { doc: d, caret: { blockIdx: 2, offset: 0 }, composing: false })!
    expect(r.patches.length).toBeGreaterThan(0)
    expect(r.nextCaret.blockIdx).toBeLessThan(2)
  })

  it('no-op when at boundary with nothing to delete', () => {
    const r = fire('deleteWordBackward', { doc: doc('hello'), caret: { blockIdx: 0, offset: 0 }, composing: false })!
    expect(r.patches).toEqual([])
  })
})
