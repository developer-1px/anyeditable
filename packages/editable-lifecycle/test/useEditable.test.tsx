import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'

afterEach(cleanup)
import { useEditable } from '../src/useEditable.js'

interface HarnessProps {
  values: Record<string, string>
  onCommit: (id: string, v: string) => void
  onNavigate?: (id: string, dir: 'down' | 'up' | 'left' | 'right') => string | null
}

function Harness(props: HarnessProps) {
  const ed = useEditable<string>({
    getValue: (id) => props.values[id] ?? '',
    onCommit: props.onCommit,
    onNavigate: props.onNavigate,
    initialFocus: 'a',
  })
  return (
    <div
      data-testid="root"
      tabIndex={0}
      onKeyDown={(e) => ed.focusId && ed.handleTypeToEdit(e, ed.focusId)}
    >
      <span data-testid="state">{ed.editing ?? 'idle'}</span>
      <span data-testid="focus">{ed.focusId ?? 'none'}</span>
      <button onClick={() => ed.startEdit('a')}>start</button>
      <button onClick={() => ed.cancelEdit()}>cancel</button>
      <button onClick={() => ed.commitEdit()}>commit</button>
      <button onClick={() => ed.startEdit('a', undefined, { caret: 'select-all' })}>start-selectall</button>
      <button onClick={() => ed.startEdit('a', undefined, { caret: 'start' })}>start-start</button>
      {ed.editing && <input data-testid="input" {...ed.inputProps} />}
    </div>
  )
}

describe('useEditable', () => {
  it('start/cancel/commit lifecycle', () => {
    const onCommit = vi.fn()
    const r = render(<Harness values={{ a: 'hello' }} onCommit={onCommit} />)

    expect(r.getByTestId('state').textContent).toBe('idle')
    fireEvent.click(r.getByText('start'))
    expect(r.getByTestId('state').textContent).toBe('a')
    expect((r.getByTestId('input') as HTMLInputElement).value).toBe('hello')

    fireEvent.change(r.getByTestId('input'), { target: { value: 'world' } })
    fireEvent.click(r.getByText('commit'))

    expect(onCommit).toHaveBeenCalledWith('a', 'world')
    expect(r.getByTestId('state').textContent).toBe('idle')
  })

  it('Escape cancels without commit', () => {
    const onCommit = vi.fn()
    const r = render(<Harness values={{ a: 'x' }} onCommit={onCommit} />)
    fireEvent.click(r.getByText('start'))
    fireEvent.change(r.getByTestId('input'), { target: { value: 'changed' } })
    fireEvent.keyDown(r.getByTestId('input'), { key: 'Escape' })

    expect(onCommit).not.toHaveBeenCalled()
    expect(r.getByTestId('state').textContent).toBe('idle')
  })

  it('Enter commits and navigates down', () => {
    const onCommit = vi.fn()
    const onNavigate = vi.fn((_id: string, dir: string) => (dir === 'down' ? 'b' : null))
    const r = render(<Harness values={{ a: 'x' }} onCommit={onCommit} onNavigate={onNavigate} />)
    fireEvent.click(r.getByText('start'))
    fireEvent.change(r.getByTestId('input'), { target: { value: 'y' } })
    fireEvent.keyDown(r.getByTestId('input'), { key: 'Enter' })

    expect(onCommit).toHaveBeenCalledWith('a', 'y')
    expect(onNavigate).toHaveBeenCalledWith('a', 'down')
    expect(r.getByTestId('focus').textContent).toBe('b')
  })

  it('Shift+Tab navigates left', () => {
    const onCommit = vi.fn()
    const onNavigate = vi.fn((_id: string, _dir: string) => 'prev')
    const r = render(<Harness values={{ a: '' }} onCommit={onCommit} onNavigate={onNavigate} />)
    fireEvent.click(r.getByText('start'))
    fireEvent.keyDown(r.getByTestId('input'), { key: 'Tab', shiftKey: true })
    expect(onNavigate).toHaveBeenCalledWith('a', 'left')
  })

  it('IME safety: Enter during composition does NOT commit', () => {
    const onCommit = vi.fn()
    const r = render(<Harness values={{ a: '' }} onCommit={onCommit} />)
    fireEvent.click(r.getByText('start'))

    const input = r.getByTestId('input')
    fireEvent.compositionStart(input)
    // Simulate Enter while IME is composing — nativeEvent.isComposing=true.
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(onCommit).not.toHaveBeenCalled()
    expect(r.getByTestId('state').textContent).toBe('a') // still editing
  })

  it('IME safety: keyCode 229 fallback is honored', () => {
    const onCommit = vi.fn()
    const r = render(<Harness values={{ a: '' }} onCommit={onCommit} />)
    fireEvent.click(r.getByText('start'))
    fireEvent.keyDown(r.getByTestId('input'), { key: 'Enter', keyCode: 229 })
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('IME safety: Enter after compositionend commits normally', () => {
    const onCommit = vi.fn()
    const r = render(<Harness values={{ a: '' }} onCommit={onCommit} />)
    fireEvent.click(r.getByText('start'))
    const input = r.getByTestId('input')
    fireEvent.compositionStart(input)
    fireEvent.compositionEnd(input)
    fireEvent.change(input, { target: { value: '한글' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCommit).toHaveBeenCalledWith('a', '한글')
  })

  it('type-to-edit starts edit with the typed character', () => {
    const onCommit = vi.fn()
    const r = render(<Harness values={{ a: 'old' }} onCommit={onCommit} />)
    fireEvent.keyDown(r.getByTestId('root'), { key: 'x' })
    expect(r.getByTestId('state').textContent).toBe('a')
    expect((r.getByTestId('input') as HTMLInputElement).value).toBe('x')
  })

  it('type-to-edit ignores modifier keys and named keys', () => {
    const onCommit = vi.fn()
    const r = render(<Harness values={{ a: 'old' }} onCommit={onCommit} />)
    fireEvent.keyDown(r.getByTestId('root'), { key: 'x', metaKey: true })
    expect(r.getByTestId('state').textContent).toBe('idle')
    fireEvent.keyDown(r.getByTestId('root'), { key: 'ArrowDown' })
    expect(r.getByTestId('state').textContent).toBe('idle')
  })

  it('type-to-edit ignores keystrokes during IME composition', () => {
    const r = render(<Harness values={{ a: '' }} onCommit={vi.fn()} />)
    fireEvent.keyDown(r.getByTestId('root'), { key: 'ㅎ', keyCode: 229 })
    expect(r.getByTestId('state').textContent).toBe('idle')
  })

  it('auto-focuses input on edit start', () => {
    const r = render(<Harness values={{ a: 'hi' }} onCommit={vi.fn()} />)
    fireEvent.click(r.getByText('start'))
    const input = r.getByTestId('input') as HTMLInputElement
    expect(document.activeElement).toBe(input)
  })

  it('caret defaults to end of value (Google Sheets F2 behavior)', () => {
    const r = render(<Harness values={{ a: 'hello' }} onCommit={vi.fn()} />)
    fireEvent.click(r.getByText('start'))
    const input = r.getByTestId('input') as HTMLInputElement
    expect(input.selectionStart).toBe(5)
    expect(input.selectionEnd).toBe(5)
  })

  it('caret select-all mode selects whole value', () => {
    const r = render(<Harness values={{ a: 'hello' }} onCommit={vi.fn()} />)
    fireEvent.click(r.getByText('start-selectall'))
    const input = r.getByTestId('input') as HTMLInputElement
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(5)
  })

  it('caret start mode places cursor at beginning', () => {
    const r = render(<Harness values={{ a: 'hello' }} onCommit={vi.fn()} />)
    fireEvent.click(r.getByText('start-start'))
    const input = r.getByTestId('input') as HTMLInputElement
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(0)
  })

  it('selectProps onChange commits + navigates down', () => {
    const onCommit = vi.fn()
    const onNavigate = vi.fn(() => 'next')
    function H() {
      const ed = useEditable<string>({
        getValue: () => '',
        onCommit, onNavigate,
        initialFocus: 'a',
      })
      return (
        <div>
          <span data-testid="state">{ed.editing ?? 'idle'}</span>
          <span data-testid="focus">{ed.focusId ?? 'none'}</span>
          <button onClick={() => ed.startEdit('a')}>start</button>
          {ed.editing && (
            <select data-testid="sel" {...ed.selectProps}>
              <option value="">—</option>
              <option value="x">x</option>
              <option value="y">y</option>
            </select>
          )}
        </div>
      )
    }
    const r = render(<H />)
    fireEvent.click(r.getByText('start'))
    fireEvent.change(r.getByTestId('sel'), { target: { value: 'y' } })
    expect(onCommit).toHaveBeenCalledWith('a', 'y')
    expect(onNavigate).toHaveBeenCalledWith('a', 'down')
    expect(r.getByTestId('focus').textContent).toBe('next')
    expect(r.getByTestId('state').textContent).toBe('idle')
  })

  it('selectProps Escape cancels without commit', () => {
    const onCommit = vi.fn()
    function H() {
      const ed = useEditable<string>({
        getValue: () => 'x',
        onCommit,
      })
      return (
        <div>
          <span data-testid="state">{ed.editing ?? 'idle'}</span>
          <button onClick={() => ed.startEdit('a')}>start</button>
          {ed.editing && (
            <select data-testid="sel" {...ed.selectProps}>
              <option value="x">x</option>
            </select>
          )}
        </div>
      )
    }
    const r = render(<H />)
    fireEvent.click(r.getByText('start'))
    fireEvent.keyDown(r.getByTestId('sel'), { key: 'Escape' })
    expect(onCommit).not.toHaveBeenCalled()
    expect(r.getByTestId('state').textContent).toBe('idle')
  })

  it('Alt+Enter does not commit (textarea newline)', () => {
    const onCommit = vi.fn()
    const r = render(<Harness values={{ a: '' }} onCommit={onCommit} />)
    fireEvent.click(r.getByText('start'))
    fireEvent.keyDown(r.getByTestId('input'), { key: 'Enter', altKey: true })
    expect(onCommit).not.toHaveBeenCalled()
    expect(r.getByTestId('state').textContent).toBe('a')
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
    const onCommit = vi.fn()
    function H() {
      const ed = useEditable<string>({
        getValue: () => 'x',
        onCommit,
        readOnly: (id) => id === 'locked',
      })
      return (
        <div>
          <span data-testid="state">{ed.editing ?? 'idle'}</span>
          <button onClick={() => ed.startEdit('locked')}>locked</button>
          <button onClick={() => ed.startEdit('open')}>open</button>
          {ed.editing && <input data-testid="input" {...ed.inputProps} />}
        </div>
      )
    }
    const r = render(<H />)
    fireEvent.click(r.getByText('locked'))
    expect(r.getByTestId('state').textContent).toBe('idle')
    fireEvent.click(r.getByText('open'))
    expect(r.getByTestId('state').textContent).toBe('open')
  })

  it('blur commits without navigation', () => {
    const onCommit = vi.fn()
    const onNavigate = vi.fn()
    const r = render(<Harness values={{ a: '' }} onCommit={onCommit} onNavigate={onNavigate} />)
    fireEvent.click(r.getByText('start'))
    fireEvent.change(r.getByTestId('input'), { target: { value: 'z' } })
    fireEvent.blur(r.getByTestId('input'))
    expect(onCommit).toHaveBeenCalledWith('a', 'z')
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
