import { describe, it, expect, vi } from 'vitest'
import { handleBI, handleCE, reEvalTrigger, type DomBridgeRefs } from '../bridgeHandlers.js'
import { EMPTY_DOC, type ComposerDoc } from '../schema.js'

function refs(overrides: Partial<DomBridgeRefs['state']['current']> = {}): DomBridgeRefs & { applied: unknown[] } {
  const applied: unknown[] = []
  const state = {
    doc: EMPTY_DOC as ComposerDoc,
    ops: { apply: (p: unknown) => { applied.push(p) } },
    triggers: { '@': 'mention' as const },
    minQueryLength: 0,
    readOnly: false,
    multiline: true,
    maxLength: undefined as number | undefined,
    dismissed: null as { blockIdx: number; startOffset: number } | null,
    ...overrides,
  }
  return {
    el: { current: null },
    caret: { current: { blockIdx: 0, offset: 0 } },
    pendingCaret: { current: null },
    composing: { current: false },
    state: { current: state },
    applied,
  }
}

function el(): HTMLElement {
  const d = document.createElement('div')
  document.body.appendChild(d)
  return d
}

function fakeIE(inputType: string, data?: string): InputEvent {
  const ev = new Event(inputType) as unknown as InputEvent
  Object.defineProperty(ev, 'inputType', { value: inputType })
  Object.defineProperty(ev, 'data', { value: data ?? null })
  return ev
}

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
})

describe('reEvalTrigger', () => {
  it('caret inside @-text → fires setTrigger with hint', () => {
    const r = refs({ doc: { blocks: [{ kind: 'text', text: '@bob' }] } as ComposerDoc })
    r.caret.current = { blockIdx: 0, offset: 4 }
    const setTrigger = vi.fn()
    reEvalTrigger(r, setTrigger)
    expect(setTrigger).toHaveBeenCalledWith(expect.objectContaining({ kind: 'mention', query: 'bob' }))
  })

  it('caret before trigger anchor → closes (null)', () => {
    const r = refs({ doc: { blocks: [{ kind: 'text', text: '@bob' }] } as ComposerDoc })
    r.caret.current = { blockIdx: 0, offset: 0 }
    const setTrigger = vi.fn()
    reEvalTrigger(r, setTrigger)
    expect(setTrigger).toHaveBeenCalledWith(null)
  })

  it('dismissed at same anchor suppresses re-open', () => {
    const r = refs({
      doc: { blocks: [{ kind: 'text', text: '@bob' }] } as ComposerDoc,
      dismissed: { blockIdx: 0, startOffset: 0 },
    })
    r.caret.current = { blockIdx: 0, offset: 4 }
    const setTrigger = vi.fn()
    reEvalTrigger(r, setTrigger)
    expect(setTrigger).toHaveBeenCalledWith(null)
  })

  it('dismissed cleared when no hint detected', () => {
    const r = refs({
      doc: { blocks: [{ kind: 'text', text: 'plain' }] } as ComposerDoc,
      dismissed: { blockIdx: 0, startOffset: 0 },
    })
    r.caret.current = { blockIdx: 0, offset: 5 }
    reEvalTrigger(r, vi.fn())
    expect(r.state.current.dismissed).toBeNull()
  })
})
