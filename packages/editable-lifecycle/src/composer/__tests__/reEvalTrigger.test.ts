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
})
