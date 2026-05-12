import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { ROOT } from '@p/aria-kernel'
import { useEphemeralCollection } from '../useEphemeralCollection.js'

const items = (...ids: string[]) => ids.map(id => ({ id, label: id.toUpperCase() }))

describe('useEphemeralCollection', () => {
  it('exposes normalized data with entities from items list', () => {
    const { result } = renderHook(() => useEphemeralCollection(items('a', 'b')))
    const [data] = result.current
    expect(Object.keys(data.entities)).toEqual(expect.arrayContaining(['a', 'b']))
  })

  it('dispatch(navigate) updates focus meta', () => {
    const { result } = renderHook(() => useEphemeralCollection(items('a', 'b')))
    const [, dispatch] = result.current
    act(() => { dispatch({ type: 'navigate', id: 'a' }) })
    expect(result.current[0].meta?.focus).toBe('a')
  })

  it('focus pruned when previous focus drops out of new items list', () => {
    const { result, rerender } = renderHook(({ list }) => useEphemeralCollection(list), {
      initialProps: { list: items('a', 'b') },
    })
    act(() => { result.current[1]({ type: 'navigate', id: 'a' }) })
    expect(result.current[0].meta?.focus).toBe('a')
    rerender({ list: items('b', 'c') }) // 'a' filtered out
    expect(result.current[0].meta?.focus ?? null).toBeNull()
  })

  it('dispatch(open) on ROOT carries through to meta.open', () => {
    const { result } = renderHook(() => useEphemeralCollection(items('x')))
    act(() => { result.current[1]({ type: 'open', id: ROOT, open: true }) })
    expect(result.current[0].meta?.open).toEqual(expect.arrayContaining([ROOT]))
  })
})
