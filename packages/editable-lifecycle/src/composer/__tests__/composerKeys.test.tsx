import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { KeyboardEvent } from 'react'
import { useComposerKeys } from '../composerKeys.js'

function fakeEvent(over: Partial<KeyboardEvent<HTMLElement>>): KeyboardEvent<HTMLElement> {
  const preventDefault = vi.fn()
  return {
    key: '', shiftKey: false, metaKey: false, ctrlKey: false, altKey: false,
    defaultPrevented: false, preventDefault,
    ...over,
  } as unknown as KeyboardEvent<HTMLElement>
}

function setup(over: Partial<Parameters<typeof useComposerKeys>[0]> = {}) {
  const opts = {
    composing: { current: false },
    trigger: null,
    setTrigger: vi.fn(),
    submit: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    ...over,
  }
  const { result } = renderHook(() => useComposerKeys(opts))
  return { handler: result.current, opts }
}

describe('useComposerKeys', () => {
  it('Enter submits and preventDefaults', () => {
    const { handler, opts } = setup()
    const e = fakeEvent({ key: 'Enter' })
    handler(e)
    expect(opts.submit).toHaveBeenCalled()
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('Shift+Enter does NOT submit', () => {
    const { handler, opts } = setup()
    handler(fakeEvent({ key: 'Enter', shiftKey: true }))
    expect(opts.submit).not.toHaveBeenCalled()
  })

  it('Enter during IME composition does NOT submit', () => {
    const { handler, opts } = setup({ composing: { current: true } })
    handler(fakeEvent({ key: 'Enter' }))
    expect(opts.submit).not.toHaveBeenCalled()
  })

  it('Cmd+Z calls onUndo', () => {
    const { handler, opts } = setup()
    handler(fakeEvent({ key: 'z', metaKey: true }))
    expect(opts.onUndo).toHaveBeenCalled()
    expect(opts.onRedo).not.toHaveBeenCalled()
  })

  it('Cmd+Shift+Z calls onRedo', () => {
    const { handler, opts } = setup()
    handler(fakeEvent({ key: 'z', metaKey: true, shiftKey: true }))
    expect(opts.onRedo).toHaveBeenCalled()
    expect(opts.onUndo).not.toHaveBeenCalled()
  })

  it('Escape with trigger clears trigger', () => {
    const { handler, opts } = setup({ trigger: { foo: 'bar' } })
    handler(fakeEvent({ key: 'Escape' }))
    expect(opts.setTrigger).toHaveBeenCalledWith(null)
  })

  it('Escape without trigger does nothing', () => {
    const { handler, opts } = setup({ trigger: null })
    handler(fakeEvent({ key: 'Escape' }))
    expect(opts.setTrigger).not.toHaveBeenCalled()
  })

  it('skips when defaultPrevented', () => {
    const { handler, opts } = setup()
    handler(fakeEvent({ key: 'Enter', defaultPrevented: true }))
    expect(opts.submit).not.toHaveBeenCalled()
  })
})
