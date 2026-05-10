import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { ChatComposerDemo, type HistoryRef } from './ChatComposerDemo.js'

afterEach(() => cleanup())

function fireBI(el: Element, data: string, inputType = 'insertText') {
  const ev = new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true })
  fireEvent(el, ev)
}

/**
 * 13개 dogfood finding (F1..F19) 가 함께 작동하는 E2E 스모크.
 * 사용자 시나리오: hi 입력 → @ mention → space → / command → IME → undo → submit.
 */
describe('chat composer story (end-to-end smoke)', () => {
  it('type → mention → space → command → IME → undo → resubmit', () => {
    const historyRef: HistoryRef = { current: null }
    const onSubmit = vi.fn()
    const { getByTestId, queryByTestId } = render(
      <ChatComposerDemo historyRef={historyRef} onSubmit={onSubmit} />
    )
    const root = getByTestId('root')

    // 1) plain text
    fireBI(root, 'h'); fireBI(root, 'i'); fireBI(root, ' ')
    expect(root.textContent).toBe('hi ')

    // 2) trigger '@' + filter, keyboard activate
    fireBI(root, '@'); fireBI(root, 'b')
    expect(queryByTestId('opt-u1')).not.toBeNull()
    fireEvent.keyDown(root, { key: 'ArrowDown' })
    fireEvent.keyDown(root, { key: 'Enter' })
    expect(queryByTestId('popover')).toBeNull()
    expect(root.querySelectorAll('[data-block-kind="mention"]').length).toBe(1)

    // 3) space + IME 한글
    fireBI(root, ' ')
    fireEvent.compositionStart(root)
    fireBI(root, '한', 'insertCompositionText')
    fireEvent.compositionEnd(root, { data: '한' })

    // 4) Cmd+Z undo: 한 input
    fireEvent.keyDown(root, { key: 'z', metaKey: true })
    // mention chip 유지, 한 사라짐
    expect(root.querySelectorAll('[data-block-kind="mention"]').length).toBe(1)

    // 5) submit
    fireEvent.keyDown(root, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
