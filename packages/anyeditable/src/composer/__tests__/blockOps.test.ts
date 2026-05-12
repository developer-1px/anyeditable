import { describe, expect, it } from 'vitest'
import { deleteBackwardPatch, deleteForwardPatch, insertTextPatch } from '../blockOps.js'
import type { Block } from '../schema.js'

const text = (t: string): Block => ({ kind: 'text', text: t })
const mention = (label: string): Block => ({ kind: 'mention', id: 'u1', label })

describe('insertTextPatch', () => {
  it('inserts mid-text', () => {
    expect(insertTextPatch([text('hello')], 0, 3, 'X')).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'helXlo' },
    ])
  })
  it('caret on atomic offset=1 → routes to next text block', () => {
    expect(insertTextPatch([text('hi'), mention('bob'), text(' tail')], 1, 1, 'X')).toEqual([
      { op: 'replace', path: '/blocks/2/text', value: 'X tail' },
    ])
  })
  it('caret on atomic offset=0 → routes to prev text block (append)', () => {
    expect(insertTextPatch([text('hi'), mention('bob'), text(' tail')], 1, 0, 'X')).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'hiX' },
    ])
  })
  it('caret on lone atomic → adds new text block at side', () => {
    expect(insertTextPatch([mention('bob')], 0, 1, 'X')).toEqual([
      { op: 'add', path: '/blocks/1', value: { kind: 'text', text: 'X' } },
    ])
  })
})

describe('deleteBackwardPatch', () => {
  it('removes char inside text', () => {
    expect(deleteBackwardPatch([text('hello')], 0, 3)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'helo' },
    ])
  })
  it('removes atomic block when caret on it (merges flanking text)', () => {
    expect(deleteBackwardPatch([text(''), mention('@bob'), text('')], 1, 0)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: '' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
  })
  it('at offset 0 with atomic prev + text prevPrev → removes atomic and merges text', () => {
    expect(deleteBackwardPatch([text('hi'), mention('@bob'), text('tail')], 2, 0)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'hitail' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
  })
  it('at offset 0 with no prev → noop', () => {
    expect(deleteBackwardPatch([text('hi')], 0, 0)).toEqual([])
  })
  it('at offset 0 with prev=text → delete last char of prev (not whole block)', () => {
    expect(deleteBackwardPatch([text('hi'), text('world')], 1, 0)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'h' },
    ])
  })
  it('at offset 0 with empty prev=text → remove prev', () => {
    expect(deleteBackwardPatch([text(''), text('world')], 1, 0)).toEqual([
      { op: 'remove', path: '/blocks/0' },
    ])
  })
})

describe('deleteForwardPatch', () => {
  it('removes char at offset (text)', () => {
    expect(deleteForwardPatch([text('hello')], 0, 0)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'ello' },
    ])
  })
  it('at end of text → removes next atomic + merges surrounding text', () => {
    expect(deleteForwardPatch([text('hi'), mention('@bob'), text('tail')], 0, 2)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: 'hitail' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
  })
  it('removes atomic when caret on it (merges flanking text)', () => {
    expect(deleteForwardPatch([text(''), mention('@bob'), text('')], 1, 0)).toEqual([
      { op: 'replace', path: '/blocks/0/text', value: '' },
      { op: 'remove', path: '/blocks/2' },
      { op: 'remove', path: '/blocks/1' },
    ])
  })
  it('at end with no next block → noop', () => {
    expect(deleteForwardPatch([text('hi')], 0, 2)).toEqual([])
  })
  it('at end with next=text → delete first char of next', () => {
    expect(deleteForwardPatch([text('hi'), text('world')], 0, 2)).toEqual([
      { op: 'replace', path: '/blocks/1/text', value: 'orld' },
    ])
  })
})
