import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { act } from 'react'
import { ChatComposerDemo, type HistoryRef } from './ChatComposerDemo.js'

afterEach(() => cleanup())

function fireBI(el: Element, data: string, inputType = 'insertText') {
  const ev = new (globalThis as { InputEvent: typeof InputEvent }).InputEvent('beforeinput', {
    inputType, data, bubbles: true, cancelable: true,
  })
  fireEvent(el, ev)
}

describe('chat composer integration (aria-kernel + zod-crud)', () => {
  it('@bo opens popover with filtered users', () => {
    const { getByTestId, queryByTestId } = render(<ChatComposerDemo />)
    const root = getByTestId('root')
    fireBI(root, '@'); fireBI(root, 'b'); fireBI(root, 'o')
    expect(queryByTestId('popover')).not.toBeNull()
    expect(queryByTestId('opt-u1')).not.toBeNull()
    expect(queryByTestId('opt-u2')).toBeNull()
  })

  it('keyboard ArrowDown+Enter activates option (via useEphemeralCollection — F8 #135 proposal B)', () => {
    const { getByTestId, queryByTestId } = render(<ChatComposerDemo />)
    const root = getByTestId('root')
    fireBI(root, '@'); fireBI(root, 'b')
    fireEvent.keyDown(root, { key: 'ArrowDown' })
    fireEvent.keyDown(root, { key: 'Enter' })
    const chip = root.querySelector('[data-block="mention"]')
    expect(chip?.textContent).toBe('@bob')
    expect(queryByTestId('popover')).toBeNull()
  })

  it('zod-crud history: undo removes last keystroke ops (dogfood useJsonDocument)', () => {
    const historyRef: HistoryRef = { current: null }
    const { getByTestId } = render(<ChatComposerDemo historyRef={historyRef} />)
    const root = getByTestId('root')
    fireBI(root, 'h'); fireBI(root, 'i')
    expect(root.textContent).toBe('hi')
    expect(historyRef.current?.canUndo).toBe(true)
    act(() => { historyRef.current?.undo() })
    expect(root.textContent).toBe('h')
    act(() => { historyRef.current?.undo() })
    expect(root.textContent).toBe('')
    expect(historyRef.current?.canUndo).toBe(false)
    expect(historyRef.current?.canRedo).toBe(true)
    act(() => { historyRef.current?.redo() })
    expect(root.textContent).toBe('h')
  })

  it('Cmd+Z keyboard shortcut wired to history.undo', () => {
    const { getByTestId } = render(<ChatComposerDemo />)
    const root = getByTestId('root')
    fireBI(root, 'h'); fireBI(root, 'i')
    expect(root.textContent).toBe('hi')
    fireEvent.keyDown(root, { key: 'z', metaKey: true })
    expect(root.textContent).toBe('h')
    fireEvent.keyDown(root, { key: 'Z', metaKey: true, shiftKey: true })
    expect(root.textContent).toBe('hi')
  })

  it('typing then deleting refines trigger query (@bob → backspace → @bo, popover refilters)', () => {
    const { getByTestId, queryByTestId } = render(<ChatComposerDemo />)
    const root = getByTestId('root')
    fireBI(root, '@'); fireBI(root, 'b'); fireBI(root, 'o'); fireBI(root, 'b')
    // bob — Bob startsWith 'bob' so opt-u1 matches
    expect(queryByTestId('opt-u1')).not.toBeNull()
    fireBI(root, '', 'deleteContentBackward')
    fireBI(root, '', 'deleteContentBackward')
    // query='b' — both 'bob' (u1) match, 'alice' (u2) and 'charlie' (u3) don't
    expect(queryByTestId('opt-u1')).not.toBeNull()
    expect(queryByTestId('opt-u2')).toBeNull()
    fireBI(root, '', 'deleteContentBackward')
    fireBI(root, '', 'deleteContentBackward')
    // deleted '@' itself → trigger cancels
    expect(queryByTestId('popover')).toBeNull()
  })

  it('blur on root cancels trigger after 100ms (popover closes)', async () => {
    const { getByTestId, queryByTestId } = render(<ChatComposerDemo />)
    const root = getByTestId('root')
    fireBI(root, '@'); fireBI(root, 'b')
    expect(queryByTestId('popover')).not.toBeNull()
    fireEvent.blur(root)
    await new Promise(r => setTimeout(r, 150))
    expect(queryByTestId('popover')).toBeNull()
  })

  it('committing via UiEvent activate from option click inserts mention chip', () => {
    const { getByTestId, queryByTestId } = render(<ChatComposerDemo />)
    const root = getByTestId('root')
    fireBI(root, '@'); fireBI(root, 'b')
    fireEvent.click(getByTestId('opt-u1'))
    const chip = root.querySelector('[data-block="mention"]')
    expect(chip?.textContent).toBe('@bob')
    expect(queryByTestId('popover')).toBeNull()
  })
})
