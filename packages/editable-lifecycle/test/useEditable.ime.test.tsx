import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { Harness } from './useEditableHarness.js'

afterEach(cleanup)

describe('useEditable — IME safety', () => {
  it('Enter during composition does NOT commit', () => {
    const onCommit = vi.fn()
    const r = render(<Harness values={{ a: '' }} onCommit={onCommit} />)
    fireEvent.click(r.getByText('start'))
    const input = r.getByTestId('input')
    fireEvent.compositionStart(input)
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(onCommit).not.toHaveBeenCalled()
    expect(r.getByTestId('state').textContent).toBe('a')
  })

  it('keyCode 229 fallback is honored', () => {
    const onCommit = vi.fn()
    const r = render(<Harness values={{ a: '' }} onCommit={onCommit} />)
    fireEvent.click(r.getByText('start'))
    fireEvent.keyDown(r.getByTestId('input'), { key: 'Enter', keyCode: 229 })
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('Enter after compositionend commits normally', () => {
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

  it('type-to-edit ignores keystrokes during IME composition', () => {
    const r = render(<Harness values={{ a: '' }} onCommit={vi.fn()} />)
    fireEvent.keyDown(r.getByTestId('root'), { key: 'ㅎ', keyCode: 229 })
    expect(r.getByTestId('state').textContent).toBe('idle')
  })
})
