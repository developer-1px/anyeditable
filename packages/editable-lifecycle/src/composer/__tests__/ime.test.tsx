import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Harness } from './Harness.js'

afterEach(() => cleanup())

function fireBI(el: Element, data: string, inputType = 'insertText') {
  const ev = new (globalThis as { InputEvent: typeof InputEvent }).InputEvent('beforeinput', {
    inputType, data, bubbles: true, cancelable: true,
  })
  fireEvent(el, ev)
}

describe('IME composition (한글 회귀)', () => {
  it('ops gated during composition, emitted on compositionend with final data', () => {
    const { getByTestId } = render(<Harness />)
    const root = getByTestId('root')
    fireEvent.compositionStart(root)
    fireBI(root, 'ㅎ', 'insertCompositionText')
    fireBI(root, '하', 'insertCompositionText')
    fireBI(root, '한', 'insertCompositionText')
    expect(root.textContent).toBe('')
    fireEvent.compositionEnd(root, { data: '한' })
    expect(root.textContent).toBe('한')
  })

  it('compositionend with empty data does not emit ops', () => {
    const { getByTestId } = render(<Harness />)
    const root = getByTestId('root')
    fireEvent.compositionStart(root)
    fireEvent.compositionEnd(root, { data: '' })
    expect(root.textContent).toBe('')
  })
})
