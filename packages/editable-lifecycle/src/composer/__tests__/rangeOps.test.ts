import { describe, expect, it } from 'vitest'
import { commitAtomicPatch, deleteRangePatch } from '../rangeOps.js'
import type { Block } from '../schema.js'

const text = (t: string): Block => ({ kind: 'text', text: t })
const mention = (label: string): Block => ({ kind: 'mention', id: 'u1', label })

describe('deleteRangePatch', () => {
  it('single block: removes mid-text range', () => {
    expect(deleteRangePatch([text('hello world')], 0, 5, 0, 11)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'hello' },
    ])
  })
  it('single atomic block flanked by text → merges flanking', () => {
    expect(deleteRangePatch([text('pre'), mention('@bob'), text('post')], 1, 0, 1, 1)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'prepost' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
  })
  it('single atomic block with no flanking text → just remove', () => {
    expect(deleteRangePatch([mention('@bob')], 0, 0, 0, 1)).toEqual([
      { op: 'remove', path: '/blocks/0' },
    ])
  })
  it('cross-block text→atomic→text: merge endpoints, drop atomic', () => {
    expect(deleteRangePatch([text('hi '), mention('@bob'), text(' check')], 0, 1, 2, 3)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'heck' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
  })
  it('cross-block atomic→text: merge into prev text block (preserves invariant)', () => {
    expect(deleteRangePatch([text(''), mention('@bob'), text(' rest')], 1, 0, 2, 1)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'rest' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
  })
  it('cross-block text→atomic with text after: fold trailing text into merged', () => {
    expect(deleteRangePatch([text('pre'), mention('@bob'), text('tail')], 0, 1, 1, 1)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'ptail' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
  })
  it('chip-to-chip range: folds both flanking text blocks into prev', () => {
    expect(deleteRangePatch(
      [text('A'), mention('@bob'), text(' mid '), mention('@al'), text('Z')],
      1, 0, 3, 1,
    )).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'AZ' },
      { op: 'remove', path: '/blocks/4' },
      { op: 'remove', path: '/blocks/3' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
  })
})

describe('commitAtomicPatch', () => {
  it('splits text and inserts atomic', () => {
    expect(commitAtomicPatch([text('hi @bo')], 0, 3, 6, mention('@bob'))).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'hi ' },
      { op: 'add', path: '/blocks/1', value: { kind: 'mention', id: 'u1', label: '@bob' } },
      { op: 'add', path: '/blocks/2', value: { kind: 'text', text: '' } },
    ])
  })
})
