import { describe, it, expect, vi } from 'vitest'
import { useRef } from 'react'
import { renderHook } from '@testing-library/react'
import { useDomBridge, type DomBridgeRefs } from '../useDomBridge.js'
import { EMPTY_DOC, type ComposerDoc } from '../schema.js'

function setup(initialDoc: ComposerDoc = EMPTY_DOC as ComposerDoc) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const applied: unknown[] = []
  const stateCurrent = {
    doc: initialDoc,
    ops: { apply: (p: unknown) => { applied.push(p) } },
    triggers: { '@': 'mention' as const },
    minQueryLength: 0,
    readOnly: false,
    multiline: true,
    maxLength: undefined as number | undefined,
    dismissed: null as { blockIdx: number; startOffset: number } | null,
  }
  const refs = {
    el: { current: el as HTMLElement | null },
    caret: { current: { blockIdx: 0, offset: 0 } },
    pendingCaret: { current: null as { blockIdx: number; offset: number } | null },
    composing: { current: false },
    state: { current: stateCurrent },
  } as DomBridgeRefs
  const setTrigger = vi.fn()
  renderHook(() => {
    const r = useRef(refs)
    useDomBridge(r.current, setTrigger)
  })
  return { el, refs, setTrigger, applied, state: stateCurrent }
}

function fakeBeforeInput(type: string, data?: string): Event {
  const ev = new Event('beforeinput', { bubbles: true, cancelable: true })
  Object.defineProperty(ev, 'inputType', { value: type })
  Object.defineProperty(ev, 'data', { value: data ?? null })
  return ev
}

describe('useDomBridge', () => {
  it('compositionstart sets composing flag', () => {
    const { el, refs } = setup()
    el.dispatchEvent(new CompositionEvent('compositionstart'))
    expect(refs.composing.current).toBe(true)
  })

  it('blur resets composing flag (defensive)', () => {
    const { el, refs } = setup()
    refs.composing.current = true
    el.dispatchEvent(new Event('blur'))
    expect(refs.composing.current).toBe(false)
  })

  it('blur after timeout clears trigger', async () => {
    const { el, setTrigger } = setup()
    el.dispatchEvent(new Event('blur'))
    await new Promise(r => setTimeout(r, 120))
    expect(setTrigger).toHaveBeenCalledWith(null)
  })

  it('focus before blur-timer fires cancels the trigger clear', async () => {
    const { el, setTrigger } = setup()
    el.dispatchEvent(new Event('blur'))
    el.dispatchEvent(new Event('focus'))
    await new Promise(r => setTimeout(r, 120))
    expect(setTrigger).not.toHaveBeenCalled()
  })

  it('beforeinput routes through handleBI (applies patch)', () => {
    const { el, applied } = setup({ blocks: [{ kind: 'text', text: 'hi' }] } as ComposerDoc)
    el.dispatchEvent(fakeBeforeInput('insertText', 'X'))
    expect(applied.length).toBeGreaterThan(0)
  })

  it('compositionend routes through handleCE', () => {
    const { el, applied, refs } = setup({ blocks: [{ kind: 'text', text: '' }] } as ComposerDoc)
    refs.composing.current = true
    el.dispatchEvent(new CompositionEvent('compositionend', { data: '하' }))
    expect(refs.composing.current).toBe(false)
    expect(applied[0]).toEqual([{ op: 'replace', path: '/blocks/0/text', value: '하' }])
  })
})
