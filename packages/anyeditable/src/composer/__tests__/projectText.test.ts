import { describe, it, expect } from 'vitest'
import { projectText, getBlockText } from '../projectText.js'

function ie(inputType: string, data?: string, paste?: string): InputEvent {
  const e: Partial<InputEvent> & { inputType: string; data: string | null; dataTransfer?: DataTransfer } = {
    inputType, data: data ?? null,
  }
  if (paste !== undefined) {
    e.dataTransfer = { getData: (t: string) => t === 'text/plain' ? paste : '' } as DataTransfer
  }
  return e as InputEvent
}

describe('projectText', () => {
  it('insertText at caret slices around', () => {
    expect(projectText('hello world', ie('insertText', '@'), 6)).toBe('hello @world')
  })
  it('insertText at end', () => {
    expect(projectText('hi', ie('insertText', '!'), 2)).toBe('hi!')
  })
  it('insertText at start', () => {
    expect(projectText('hi', ie('insertText', '*'), 0)).toBe('*hi')
  })
  it('insertReplacementText also slices', () => {
    expect(projectText('foo', ie('insertReplacementText', 'XX'), 1)).toBe('fXXoo')
  })
  it('paste uses dataTransfer text/plain', () => {
    expect(projectText('ab', ie('insertFromPaste', undefined, 'XYZ'), 1)).toBe('aXYZb')
  })
  it('insertFromDrop uses dataTransfer', () => {
    expect(projectText('ab', ie('insertFromDrop', undefined, 'd'), 2)).toBe('abd')
  })
  it('deleteContentBackward removes char before caret', () => {
    expect(projectText('hello', ie('deleteContentBackward'), 3)).toBe('helo')
  })
  it('deleteContentBackward at caret=0 → unchanged', () => {
    expect(projectText('hi', ie('deleteContentBackward'), 0)).toBe('hi')
  })
  it('unknown inputType → returns text unchanged', () => {
    expect(projectText('hi', ie('formatBold'), 1)).toBe('hi')
  })
  it('insertLineBreak / insertParagraph are not projected (handled by host)', () => {
    expect(projectText('ab', ie('insertLineBreak'), 1)).toBe('ab')
    expect(projectText('ab', ie('insertParagraph'), 1)).toBe('ab')
  })
})

describe('getBlockText', () => {
  it('text block returns text', () => {
    expect(getBlockText({ blocks: [{ kind: 'text', text: 'abc' }] }, 0)).toBe('abc')
  })
  it('atomic block returns empty string', () => {
    expect(getBlockText({ blocks: [{ kind: 'mention', id: 'u', label: 'x' }] }, 0)).toBe('')
  })
  it('out-of-range returns empty', () => {
    expect(getBlockText({ blocks: [] }, 5)).toBe('')
  })
})
