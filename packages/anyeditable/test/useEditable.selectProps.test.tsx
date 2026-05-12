import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { useEditable } from '../src/useEditable.js'

afterEach(cleanup)

describe('useEditable — selectProps', () => {
  it('onChange commits + navigates down', () => {
    const onCommit = vi.fn()
    const onNavigate = vi.fn(() => 'next')
    function H() {
      const ed = useEditable<string>({ getValue: () => '', onCommit, onNavigate, initialFocus: 'a' })
      return (
        <div>
          <span data-testid="state">{ed.editing ?? 'idle'}</span>
          <span data-testid="focus">{ed.focusId ?? 'none'}</span>
          <button onClick={() => ed.startEdit('a')}>start</button>
          {ed.editing && (
            <select data-testid="sel" {...ed.selectProps}>
              <option value="">—</option>
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
  })

  it('Escape cancels without commit', () => {
    const onCommit = vi.fn()
    function H() {
      const ed = useEditable<string>({ getValue: () => 'x', onCommit })
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
})
