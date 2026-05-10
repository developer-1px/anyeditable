import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useEditableComposer, type UseEditableComposerOptions } from '../useEditableComposer.js'
import { EMPTY_DOC, type ComposerDoc, type Block } from '../schema.js'

function setup(over: Partial<UseEditableComposerOptions> = {}) {
  let doc: ComposerDoc = EMPTY_DOC as ComposerDoc
  const applied: unknown[] = []
  const ops = { apply: (p: readonly unknown[]) => { applied.push(p) } }
  const opts: UseEditableComposerOptions = {
    doc, ops,
    triggers: { '@': 'mention', '/': 'command' },
    ...over,
  }
  const { result, rerender } = renderHook(({ d }: { d: ComposerDoc }) => useEditableComposer({ ...opts, doc: d }), {
    initialProps: { d: doc },
  })
  return { result, rerender, applied, setDoc: (next: ComposerDoc) => { doc = next; rerender({ d: next }) } }
}

describe('useEditableComposer', () => {
  it('returns containerProps with textbox role + content-editable when not readOnly', () => {
    const { result } = setup()
    expect(result.current.containerProps.role).toBe('textbox')
    expect(result.current.containerProps.contentEditable).toBe(true)
  })

  it('returns empty portals + null trigger initially', () => {
    const { result } = setup()
    expect(result.current.portals).toEqual([])
    expect(result.current.trigger).toBeNull()
  })

  it('commitAtomic does nothing when trigger is null', () => {
    const { result, applied } = setup()
    act(() => { result.current.commitAtomic({ kind: 'mention', id: 'u', label: 'bob' }) })
    expect(applied).toEqual([])
  })

  it('cancelTrigger is callable without throw when no trigger', () => {
    const { result } = setup()
    expect(() => act(() => { result.current.cancelTrigger() })).not.toThrow()
  })

  it('readOnly disables contentEditable + aria-readonly', () => {
    const { result } = setup({ readOnly: true })
    expect(result.current.containerProps.contentEditable).toBe(false)
    expect(result.current.containerProps['aria-readonly']).toBe(true)
  })

  it('label + labelledBy threaded to aria attrs', () => {
    const { result } = setup({ label: 'Message', labelledBy: 'msg-label' })
    expect(result.current.containerProps['aria-label']).toBe('Message')
    expect(result.current.containerProps['aria-labelledby']).toBe('msg-label')
  })

  it('placeholder threaded to aria + data attrs', () => {
    const { result } = setup({ placeholder: 'Say hi' })
    expect(result.current.containerProps['aria-placeholder']).toBe('Say hi')
    expect((result.current.containerProps as Record<string, unknown>)['data-placeholder']).toBe('Say hi')
  })

  it('renderAtomic option produces portal entries when doc has atomics', () => {
    const renderAtomic = (b: Block) => b.kind === 'mention' ? '@' + b.label : null
    const { result, rerender } = setup({ renderAtomic })
    const root = document.createElement('div')
    document.body.appendChild(root)
    act(() => { result.current.containerRef(root) })
    rerender({ d: { blocks: [{ kind: 'text', text: '' }, { kind: 'mention', id: 'u', label: 'bob' }, { kind: 'text', text: '' }] } as ComposerDoc })
    expect(result.current.portals.length).toBe(1)
  })
})
