import { describe, expect, it } from 'vitest'
import { commitAtomicPatch, deleteBackwardPatch, deleteForwardPatch, deleteRangePatch, insertTextPatch } from '../blockOps.js'
import type { Block } from '../schema.js'

const text = (t: string): Block => ({ kind: 'text', text: t })
const mention = (label: string): Block => ({ kind: 'mention', id: 'u1', label })

describe('insertTextPatch', () => {
  it('inserts mid-text', () => {
    expect(insertTextPatch([text('hello')], 0, 3, 'X')).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'helXlo' },
    ])
  })
})

describe('deleteBackwardPatch', () => {
  it('removes char inside text', () => {
    expect(deleteBackwardPatch([text('hello')], 0, 3)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'helo' },
    ])
  })
  it('removes atomic block when caret on it', () => {
    expect(deleteBackwardPatch([text(''), mention('@bob'), text('')], 1, 0)).toEqual([
      { op: 'remove', path: '/blocks/1' },
    ])
  })
})

describe('deleteForwardPatch', () => {
  it('removes char at offset (text)', () => {
    expect(deleteForwardPatch([text('hello')], 0, 0)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'ello' },
    ])
  })
  it('at end of text → removes next atomic block', () => {
    expect(deleteForwardPatch([text('hi'), mention('@bob'), text('')], 0, 2)).toEqual([
      { op: 'remove', path: '/blocks/1' },
    ])
  })
  it('removes atomic when caret on it', () => {
    expect(deleteForwardPatch([text(''), mention('@bob'), text('')], 1, 0)).toEqual([
      { op: 'remove', path: '/blocks/1' },
    ])
  })
  it('at end with no next block → noop', () => {
    expect(deleteForwardPatch([text('hi')], 0, 2)).toEqual([])
  })
})

describe('deleteRangePatch', () => {
  it('single block: removes mid-text range', () => {
    expect(deleteRangePatch([text('hello world')], 0, 5, 0, 11)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'hello' },
    ])
  })
  it('cross-block text→atomic→text: merge endpoints, drop atomic', () => {
    expect(deleteRangePatch([text('hi '), mention('@bob'), text(' check')], 0, 1, 2, 3)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'heck' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
  })
  it('cross-block atomic→text: replace atomic with merged text', () => {
    expect(deleteRangePatch([text(''), mention('@bob'), text(' rest')], 1, 0, 2, 1)).toEqual([
      { op: 'replace', path: '/blocks/1', value: { kind: 'text', text: 'rest' } },
      { op: 'remove', path: '/blocks/2' },
    ])
  })
})

describe('commitAtomicPatch', () => {
  it('splits text and inserts atomic', () => {
    const blocks = [text('hi @bo')]
    const patches = commitAtomicPatch(blocks, 0, 3, 6, mention('@bob'))
    expect(patches).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'hi ' },
      { op: 'add', path: '/blocks/1', value: { kind: 'mention', id: 'u1', label: '@bob' } },
      { op: 'add', path: '/blocks/2', value: { kind: 'text', text: '' } },
    ])
  })
})
