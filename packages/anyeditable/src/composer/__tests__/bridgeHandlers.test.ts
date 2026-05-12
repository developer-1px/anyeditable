import { describe, it, expect, vi } from 'vitest'
import { handleBI, handleCE } from '../bridgeHandlers.js'
import { type ComposerDoc } from '../schema.js'
import { refs, el, fakeIE } from './bridgeHelpers.js'

describe('handleBI', () => {
  it('readOnly preventDefaults and does nothing', () => {
    const r = refs({ readOnly: true })
    const ie = fakeIE('insertText', 'a')
    const pd = vi.spyOn(ie, 'preventDefault')
    handleBI(ie, el(), r, vi.fn())
    expect(pd).toHaveBeenCalled()
    expect(r.applied).toEqual([])
  })

  it('multiline=false suppresses insertLineBreak', () => {
    const r = refs({ multiline: false })
    const ie = fakeIE('insertLineBreak')
    const pd = vi.spyOn(ie, 'preventDefault')
    handleBI(ie, el(), r, vi.fn())
    expect(pd).toHaveBeenCalled()
    expect(r.applied).toEqual([])
  })

  it('insertText forwards patches via ops.apply', () => {
    const r = refs({ doc: { blocks: [{ kind: 'text', text: 'hi' }] } as ComposerDoc })
    r.caret.current = { blockIdx: 0, offset: 2 }
    const ie = fakeIE('insertText', 'X')
    handleBI(ie, el(), r, vi.fn())
    expect(r.applied).toHaveLength(1)
    expect(r.applied[0]).toEqual([{ op: 'replace', path: '/blocks/0/text', value: 'hiX' }])
    expect(r.pendingCaret.current).toEqual({ blockIdx: 0, offset: 3 })
  })

  it('maxLength forecast allows insert exactly at limit', () => {
    const r = refs({
      doc: { blocks: [{ kind: 'text', text: 'x'.repeat(9) }] } as ComposerDoc,
      maxLength: 10,
    })
    r.caret.current = { blockIdx: 0, offset: 9 }
    handleBI(fakeIE('insertText', 'y'), el(), r, vi.fn())
    expect(r.applied).toHaveLength(1)
  })

  it('maxLength forecast blocks insert that would exceed', () => {
    const r = refs({
      doc: { blocks: [{ kind: 'text', text: 'x'.repeat(10) }] } as ComposerDoc,
      maxLength: 10,
    })
    r.caret.current = { blockIdx: 0, offset: 10 }
    handleBI(fakeIE('insertText', 'y'), el(), r, vi.fn())
    expect(r.applied).toEqual([])
  })
})

describe('handleCE', () => {
  it('inserts IME composed text and advances caret', () => {
    const r = refs({ doc: { blocks: [{ kind: 'text', text: '' }] } as ComposerDoc })
    r.composing.current = true
    const ce = new CompositionEvent('compositionend', { data: '하' })
    handleCE(ce, r, vi.fn())
    expect(r.composing.current).toBe(false)
    expect(r.applied[0]).toEqual([{ op: 'replace', path: '/blocks/0/text', value: '하' }])
    expect(r.caret.current).toEqual({ blockIdx: 0, offset: 1 })
  })

  it('empty composed text → no-op (only clears composing flag)', () => {
    const r = refs()
    r.composing.current = true
    handleCE(new CompositionEvent('compositionend', { data: '' }), r, vi.fn())
    expect(r.composing.current).toBe(false)
    expect(r.applied).toEqual([])
  })

  it('readOnly → no-op even with non-empty data', () => {
    const r = refs({ readOnly: true, doc: { blocks: [{ kind: 'text', text: '' }] } as ComposerDoc })
    r.composing.current = true
    handleCE(new CompositionEvent('compositionend', { data: '하' }), r, vi.fn())
    expect(r.composing.current).toBe(false)
    expect(r.applied).toEqual([])
  })
})
