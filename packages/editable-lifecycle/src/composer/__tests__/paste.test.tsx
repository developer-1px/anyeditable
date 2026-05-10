import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Harness } from './Harness.js'

afterEach(() => cleanup())

function firePaste(root: Element, dt: { getData: (k: string) => string }) {
  const ev = new InputEvent('beforeinput', {
    inputType: 'insertFromPaste', data: null, bubbles: true, cancelable: true,
  })
  Object.defineProperty(ev, 'dataTransfer', { value: dt })
  fireEvent(root, ev)
}

describe('paste-as-plain-text', () => {
  it('inserts text from clipboardData text/plain', () => {
    const { getByTestId } = render(<Harness />)
    const root = getByTestId('root')
    firePaste(root, { getData: k => k === 'text/plain' ? 'pasted' : '' })
    expect(root.textContent).toBe('pasted')
  })

  it('with no text/plain data → no-op', () => {
    const { getByTestId } = render(<Harness />)
    const root = getByTestId('root')
    firePaste(root, { getData: () => '' })
    expect(root.textContent).toBe('')
  })

  it('multi-line text/plain preserves newlines (single block)', () => {
    const { getByTestId } = render(<Harness />)
    const root = getByTestId('root')
    firePaste(root, { getData: k => k === 'text/plain' ? 'a\nb' : '' })
    expect(root.textContent).toBe('a\nb')
  })
})
