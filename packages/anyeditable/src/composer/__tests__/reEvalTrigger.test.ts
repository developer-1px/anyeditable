import { describe, it, expect, vi } from 'vitest'
import { reEvalTrigger } from '../bridgeHandlers.js'
import { type ComposerDoc } from '../schema.js'
import { refs } from './bridgeHelpers.js'

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

  it('dismissed cleared when anchor char no longer matches a trigger', () => {
    const r = refs({
      doc: { blocks: [{ kind: 'text', text: 'x@bob' }] } as ComposerDoc,
      dismissed: { blockIdx: 0, startOffset: 0 }, // anchor was at idx 0, but now char[0]='x' not '@'
    })
    r.caret.current = { blockIdx: 0, offset: 5 }
    reEvalTrigger(r, vi.fn())
    expect(r.state.current.dismissed).toBeNull()
  })

  it('dismissed cleared when block no longer exists (doc shrunk)', () => {
    const r = refs({
      doc: { blocks: [{ kind: 'text', text: 'hi' }] } as ComposerDoc,
      dismissed: { blockIdx: 9, startOffset: 0 },
    })
    r.caret.current = { blockIdx: 0, offset: 2 }
    reEvalTrigger(r, vi.fn())
    expect(r.state.current.dismissed).toBeNull()
  })
})
