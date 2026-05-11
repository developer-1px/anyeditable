import { describe, it, expect } from 'vitest'
import { rangeDelete, rangeReplace, insertNoRange } from '../inputHelpers.js'
import type { Block } from '../schema.js'

const text = (s: string): Block => ({ kind: 'text', text: s })

describe('insertNoRange', () => {
  it('inserts at caret and advances offset by data length', () => {
    const r = insertNoRange({ blocks: [text('hi')] }, { blockIdx: 0, offset: 1 }, 'XY')
    expect(r.patches).toEqual([{ op: 'replace', path: '/blocks/0/text', value: 'hXYi' }])
    expect(r.nextCaret).toEqual({ blockIdx: 0, offset: 3 })
  })
})

describe('rangeReplace', () => {
  it('same-block: replaces selected range with data', () => {
    const r = rangeReplace({ blocks: [text('abcdef')] }, { startBlock: 0, startOffset: 1, endBlock: 0, endOffset: 4 }, 'Z')
    expect(r.patches).toEqual([{ op: 'replace', path: '/blocks/0/text', value: 'aZef' }])
    expect(r.nextCaret).toEqual({ blockIdx: 0, offset: 2 })
  })

  it('endB=atomic + next=text: folds trailing text to preserve invariant', () => {
    const r = rangeReplace(
      { blocks: [{ kind: 'text', text: 'pre' }, { kind: 'mention', id: 'u', label: 'x' }, { kind: 'text', text: 'tail' }] },
      { startBlock: 0, startOffset: 1, endBlock: 1, endOffset: 1 },
      'Z',
    )
    expect(r.patches).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'pZtail' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
  })

  it('cross-block: collapses to single merged text block', () => {
    const r = rangeReplace(
      { blocks: [text('hello'), text('atomic-placeholder'), text('world')] },
      { startBlock: 0, startOffset: 3, endBlock: 2, endOffset: 2 },
      'XX',
    )
    expect(r.patches).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'helXXrld' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
    expect(r.nextCaret).toEqual({ blockIdx: 0, offset: 5 })
  })
})

describe('rangeDelete', () => {
  it('deleteWordBackward removes prev word', () => {
    const r = rangeDelete({ blocks: [text('hello world')] }, { blockIdx: 0, offset: 11 }, 'deleteWordBackward')
    expect(r.patches[0]).toEqual({ op: 'replace', path: '/blocks/0/text', value: 'hello ' })
    expect(r.nextCaret).toEqual({ blockIdx: 0, offset: 6 })
  })

  it('deleteWordForward removes next word', () => {
    const r = rangeDelete({ blocks: [text('hello world')] }, { blockIdx: 0, offset: 0 }, 'deleteWordForward')
    expect(r.patches[0]).toEqual({ op: 'replace', path: '/blocks/0/text', value: ' world' })
  })

  it('deleteSoftLineBackward removes to start of line', () => {
    const r = rangeDelete({ blocks: [text('line1\nline2tail')] }, { blockIdx: 0, offset: 11 }, 'deleteSoftLineBackward')
    expect(r.patches[0]).toEqual({ op: 'replace', path: '/blocks/0/text', value: 'line1\ntail' })
  })

  it('no-op when boundary is at caret', () => {
    const r = rangeDelete({ blocks: [text('a')] }, { blockIdx: 0, offset: 0 }, 'deleteWordBackward')
    expect(r.patches).toEqual([])
  })
})
