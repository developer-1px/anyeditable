import { describe, it, expect } from 'vitest'
import { mountClipboard, selectRange, dispatchClipboard } from './clipboardHelpers.js'

describe('useClipboard', () => {
  it('copy writes serializeRange to text/plain with chip preserved', () => {
    const { root } = mountClipboard()
    selectRange(root, 0, 2, 2, 3)
    const { writes, pd } = dispatchClipboard(root, 'copy')
    expect(pd).toHaveBeenCalled()
    expect(writes).toEqual([['text/plain', 'llo@bob wo']])
  })

  it('cut writes clipboard AND applies range-delete patches', () => {
    const { root, applied } = mountClipboard()
    selectRange(root, 0, 0, 2, 6)
    const { writes } = dispatchClipboard(root, 'cut')
    expect(writes[0]?.[1]).toBe('hello@bob world')
    expect(applied.length).toBe(1)
  })

  it('cut on readOnly: writes clipboard but does NOT mutate doc', () => {
    const { root, applied } = mountClipboard({ readOnly: true })
    selectRange(root, 0, 0, 2, 6)
    const { writes } = dispatchClipboard(root, 'cut')
    expect(writes[0]?.[1]).toBe('hello@bob world')
    expect(applied).toEqual([])
  })

  it('collapsed selection → no clipboard write, no delete', () => {
    const { root, applied } = mountClipboard()
    selectRange(root, 0, 1, 0, 1)
    const { writes, pd } = dispatchClipboard(root, 'copy')
    expect(writes).toEqual([])
    expect(pd).not.toHaveBeenCalled()
    expect(applied).toEqual([])
  })
})
