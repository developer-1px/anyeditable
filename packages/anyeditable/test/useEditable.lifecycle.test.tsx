import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { Harness } from './useEditableHarness.js'

afterEach(cleanup)

describe('useEditable — lifecycle', () => {
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
    const onNavigate = vi.fn((_id: string, _dir: string) => 'prev')
    const r = render(<Harness values={{ a: '' }} onCommit={vi.fn()} onNavigate={onNavigate} />)
    fireEvent.click(r.getByText('start'))
    fireEvent.keyDown(r.getByTestId('input'), { key: 'Tab', shiftKey: true })
    expect(onNavigate).toHaveBeenCalledWith('a', 'left')
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
