import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { useEditable } from '../src/useEditable.js'
import { Harness } from './useEditableHarness.js'

afterEach(cleanup)

describe('useEditable — type-to-edit', () => {
  it('starts edit with the typed character', () => {
    const r = render(<Harness values={{ a: 'old' }} onCommit={vi.fn()} />)
    fireEvent.keyDown(r.getByTestId('root'), { key: 'x' })
    expect(r.getByTestId('state').textContent).toBe('a')
    expect((r.getByTestId('input') as HTMLInputElement).value).toBe('x')
  })

  it('ignores modifier keys and named keys', () => {
    const r = render(<Harness values={{ a: 'old' }} onCommit={vi.fn()} />)
    fireEvent.keyDown(r.getByTestId('root'), { key: 'x', metaKey: true })
    expect(r.getByTestId('state').textContent).toBe('idle')
    fireEvent.keyDown(r.getByTestId('root'), { key: 'ArrowDown' })
    expect(r.getByTestId('state').textContent).toBe('idle')
  })
})

describe('useEditable — caret modes', () => {
  it('auto-focuses input on edit start', () => {
    const r = render(<Harness values={{ a: 'hi' }} onCommit={vi.fn()} />)
    fireEvent.click(r.getByText('start'))
    expect(document.activeElement).toBe(r.getByTestId('input'))
  })

  it('defaults to end of value (Google Sheets F2 behavior)', () => {
    const r = render(<Harness values={{ a: 'hello' }} onCommit={vi.fn()} />)
    fireEvent.click(r.getByText('start'))
    const input = r.getByTestId('input') as HTMLInputElement
    expect(input.selectionStart).toBe(5)
    expect(input.selectionEnd).toBe(5)
  })

  it('select-all mode selects whole value', () => {
    const r = render(<Harness values={{ a: 'hello' }} onCommit={vi.fn()} />)
    fireEvent.click(r.getByText('start-selectall'))
    const input = r.getByTestId('input') as HTMLInputElement
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(5)
  })

  it('start mode places cursor at beginning', () => {
    const r = render(<Harness values={{ a: 'hello' }} onCommit={vi.fn()} />)
    fireEvent.click(r.getByText('start-start'))
    const input = r.getByTestId('input') as HTMLInputElement
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(0)
  })
})

describe('useEditable — commit keymap', () => {
  it('Alt+Enter does not commit (textarea newline)', () => {
    const onCommit = vi.fn()
    const r = render(<Harness values={{ a: '' }} onCommit={onCommit} />)
    fireEvent.click(r.getByText('start'))
    fireEvent.keyDown(r.getByTestId('input'), { key: 'Enter', altKey: true })
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('Cmd+Enter commits without navigation', () => {
    const onCommit = vi.fn()
    const onNavigate = vi.fn()
    const r = render(<Harness values={{ a: '' }} onCommit={onCommit} onNavigate={onNavigate} />)
    fireEvent.click(r.getByText('start'))
    fireEvent.change(r.getByTestId('input'), { target: { value: 'k' } })
    fireEvent.keyDown(r.getByTestId('input'), { key: 'Enter', metaKey: true })
    expect(onCommit).toHaveBeenCalledWith('a', 'k')
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('readOnly blocks startEdit', () => {
    function H() {
      const ed = useEditable<string>({ getValue: () => 'x', onCommit: vi.fn(), readOnly: (id) => id === 'locked' })
      return (
        <div>
          <span data-testid="state">{ed.editing ?? 'idle'}</span>
          <button onClick={() => ed.startEdit('locked')}>locked</button>
          <button onClick={() => ed.startEdit('open')}>open</button>
        </div>
      )
    }
    const r = render(<H />)
    fireEvent.click(r.getByText('locked'))
    expect(r.getByTestId('state').textContent).toBe('idle')
    fireEvent.click(r.getByText('open'))
    expect(r.getByTestId('state').textContent).toBe('open')
  })
})
