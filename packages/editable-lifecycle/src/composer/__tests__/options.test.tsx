import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { useState } from 'react'
import { useEditableComposer } from '../useEditableComposer.js'
import { EMPTY_DOC } from '../schema.js'
import { makeOps } from './Harness.js'

function App({ readOnly, placeholder, maxLength }: { readOnly?: boolean; placeholder?: string; maxLength?: number }) {
  const [doc, setDoc] = useState(EMPTY_DOC)
  const opts: Parameters<typeof useEditableComposer>[0] = {
    doc, ops: makeOps(() => doc, setDoc), triggers: { '@': 'mention' },
    ...(readOnly !== undefined && { readOnly }),
    ...(placeholder !== undefined && { placeholder }),
    ...(maxLength !== undefined && { maxLength }),
  }
  const c = useEditableComposer(opts)
  return (
    <div data-testid="root" {...c.rootProps}>
      {doc.blocks.map((b, i) =>
        b.kind === 'text'
          ? <span key={i} {...c.blockProps(i)}>{b.text}</span>
          : <span key={i} {...c.blockProps(i)} {...c.atomicProps(i)}>{b.kind === 'mention' ? b.label : '/' + b.name}</span>
      )}
      <output data-testid="len">{doc.blocks.reduce((n, b) => n + (b.kind === 'text' ? b.text.length : 1), 0)}</output>
    </div>
  )
}

describe('useEditableComposer options (production polish)', () => {
  it('readOnly: contentEditable=false + aria-readonly + blocks beforeinput', () => {
    const { getByTestId } = render(<App readOnly />)
    const root = getByTestId('root')
    expect(root.getAttribute('contenteditable')).toBe('false')
    expect(root.getAttribute('aria-readonly')).toBe('true')
    const ev = new InputEvent('beforeinput', { inputType: 'insertText', data: 'X', bubbles: true, cancelable: true })
    root.dispatchEvent(ev)
    expect(getByTestId('len').textContent).toBe('0')
  })

  it('placeholder: data-placeholder + aria-placeholder set', () => {
    const { getByTestId } = render(<App placeholder="Type a message…" />)
    const root = getByTestId('root')
    expect(root.getAttribute('data-placeholder')).toBe('Type a message…')
    expect(root.getAttribute('aria-placeholder')).toBe('Type a message…')
  })

  it('maxLength: blocks insertText once doc length reaches the cap', () => {
    const { getByTestId } = render(<App maxLength={3} />)
    const root = getByTestId('root')
    const fire = (data: string) => act(() => {
      const ev = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true })
      root.dispatchEvent(ev)
    })
    fire('a'); fire('b'); fire('c')
    expect(getByTestId('len').textContent).toBe('3')
    fire('d')
    expect(getByTestId('len').textContent).toBe('3')
  })

  it('default: contentEditable=true, no aria-readonly, no placeholder', () => {
    const { getByTestId } = render(<App />)
    const root = getByTestId('root')
    expect(root.getAttribute('contenteditable')).toBe('true')
    expect(root.hasAttribute('aria-readonly')).toBe(false)
    expect(root.hasAttribute('data-placeholder')).toBe(false)
  })
})

