import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSyncDocOps } from '../syncDocOps.js'
import { EMPTY_DOC, type ComposerDoc } from '../schema.js'

describe('useSyncDocOps', () => {
  it('forwards apply to user.ops AND advances stateRef.current.doc synchronously', () => {
    const userApply = vi.fn()
    const stateRef = { current: { doc: EMPTY_DOC as ComposerDoc } }
    const { result } = renderHook(() => useSyncDocOps({ apply: userApply }, stateRef))
    result.current.apply([{ op: 'add', path: '/blocks/0', value: { kind: 'text', text: 'hi' } }])
    expect(userApply).toHaveBeenCalledTimes(1)
    expect(stateRef.current.doc).toEqual({ blocks: [{ kind: 'text', text: 'hi' }] })
  })

  it('sequential applies see each prior patch (no batching staleness)', () => {
    const userApply = vi.fn()
    const stateRef = { current: { doc: EMPTY_DOC as ComposerDoc } }
    const { result } = renderHook(() => useSyncDocOps({ apply: userApply }, stateRef))
    result.current.apply([{ op: 'add', path: '/blocks/0', value: { kind: 'text', text: 'a' } }])
    result.current.apply([{ op: 'replace', path: '/blocks/0/text', value: 'ab' }])
    result.current.apply([{ op: 'replace', path: '/blocks/0/text', value: 'abc' }])
    expect(stateRef.current.doc).toEqual({ blocks: [{ kind: 'text', text: 'abc' }] })
    expect(userApply).toHaveBeenCalledTimes(3)
  })

  it('invalid patch result is dropped: user.apply NOT called, stateRef unchanged', () => {
    const userApply = vi.fn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stateRef = { current: { doc: { blocks: [{ kind: 'text', text: 'hi' }] } as ComposerDoc } }
    const { result } = renderHook(() => useSyncDocOps({ apply: userApply }, stateRef))
    // Remove from out-of-range index — zod-crud applyPatch returns !ok.
    result.current.apply([{ op: 'remove', path: '/blocks/99' }])
    expect(userApply).not.toHaveBeenCalled()
    expect(stateRef.current.doc).toEqual({ blocks: [{ kind: 'text', text: 'hi' }] })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
