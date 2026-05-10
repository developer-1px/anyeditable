import { describe, it, expect } from 'vitest'
import { useRef } from 'react'
import { renderHook } from '@testing-library/react'
import { useDocReconciler, type CaretPos } from '../useDocReconciler.js'
import type { Block, ComposerDoc } from '../schema.js'

const text = (s: string): Block => ({ kind: 'text', text: s })
const mention = (label: string): Block => ({ kind: 'mention', id: 'u', label })

function mount(initialDoc: ComposerDoc, renderAtomic?: (b: Block) => React.ReactNode) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const pendingCaret = { current: null as CaretPos | null }
  const { rerender, result } = renderHook(({ d }: { d: ComposerDoc }) => {
    const ref = useRef<HTMLElement | null>(root)
    return useDocReconciler(ref, d, renderAtomic, pendingCaret)
  }, { initialProps: { d: initialDoc } })
  return { root, rerender, portals: () => result.current, pendingCaret }
}

describe('useDocReconciler', () => {
  it('renders text block as <span> with nodeValue', () => {
    const { root } = mount({ blocks: [text('hello')] })
    expect(root.children.length).toBe(1)
    expect((root.children[0] as HTMLElement).dataset.blockKind).toBe('text')
    expect(root.textContent).toBe('hello')
  })

  it('mutates text in-place on text-change (same span node)', () => {
    const { root, rerender } = mount({ blocks: [text('a')] })
    const span = root.children[0]
    rerender({ d: { blocks: [text('abc')] } })
    expect(root.children[0]).toBe(span) // same DOM node — Lexical-concept in-place
    expect(root.textContent).toBe('abc')
  })

  it('shrinks DOM when blocks removed', () => {
    const { root, rerender } = mount({ blocks: [text('a'), text('b'), text('c')] })
    expect(root.children.length).toBe(3)
    rerender({ d: { blocks: [text('a')] } })
    expect(root.children.length).toBe(1)
  })

  it('atomic without renderAtomic falls back to label text with trigger prefix', () => {
    const { root } = mount({ blocks: [mention('bob')] })
    const c0 = root.children[0]!
    expect(c0.textContent).toBe('@bob')
    expect((c0 as HTMLElement).getAttribute('aria-label')).toBe('@bob')
  })

  it('atomic with renderAtomic produces portal entry; native DOM marker still set', () => {
    const { root, portals } = mount({ blocks: [text(''), mention('alice'), text('')] }, () => null)
    expect((root.children[1] as HTMLElement).contentEditable).toBe('false')
    expect((root.children[1] as HTMLElement).dataset.blockKind).toBe('mention')
    expect(portals().length).toBe(1) // one portal for the mention
  })

  it('skips re-render when no atomics and no portals (text-only docs)', () => {
    const { portals, rerender } = mount({ blocks: [text('a')] })
    const p1 = portals()
    rerender({ d: { blocks: [text('ab')] } })
    expect(portals()).toBe(p1) // identity preserved → no React reconciliation cost
  })
})
