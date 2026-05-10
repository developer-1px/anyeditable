import { describe, it, expect, vi } from 'vitest'
import { useRef } from 'react'
import { renderHook } from '@testing-library/react'
import { useAutoFocus } from '../useAutoFocus.js'

describe('useAutoFocus', () => {
  it('does nothing when disabled', () => {
    const el = { focus: vi.fn() } as unknown as HTMLElement
    renderHook(() => {
      const r = useRef<HTMLElement | null>(el)
      useAutoFocus(r, false)
    })
    expect((el as unknown as { focus: ReturnType<typeof vi.fn> }).focus).not.toHaveBeenCalled()
  })

  it('calls focus + collapses selection on the element when enabled', () => {
    const focus = vi.fn()
    const el = document.createElement('div')
    el.textContent = 'hello'
    document.body.appendChild(el)
    Object.defineProperty(el, 'focus', { value: focus })
    renderHook(() => {
      const r = useRef<HTMLElement | null>(el)
      useAutoFocus(r, true)
    })
    expect(focus).toHaveBeenCalled()
    const sel = document.getSelection()
    expect(sel?.isCollapsed).toBe(true)
    document.body.removeChild(el)
  })

  it('null ref → noop (no throw)', () => {
    expect(() => renderHook(() => {
      const r = useRef<HTMLElement | null>(null)
      useAutoFocus(r, true)
    })).not.toThrow()
  })
})
