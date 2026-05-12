import { describe, it, expect } from 'vitest'
import { serialize, serializeRange, serializeBlock } from '../serialize.js'
import type { ComposerDoc } from '../schema.js'

const doc: ComposerDoc = {
  blocks: [
    { kind: 'text', text: 'hey ' },
    { kind: 'mention', id: 'bob', label: 'Bob' },
    { kind: 'text', text: ' run ' },
    { kind: 'command', name: 'archive' },
    { kind: 'text', text: '!' },
  ],
}

describe('serialize (clipboard / submit payload SSOT)', () => {
  it('whole-doc serializes mentions back to @label and commands to /name', () => {
    expect(serialize(doc)).toBe('hey @Bob run /archive!')
  })

  it('serializeBlock projects atomics to trigger form', () => {
    expect(serializeBlock({ kind: 'mention', id: 'b', label: 'Bob' })).toBe('@Bob')
    expect(serializeBlock({ kind: 'command', name: 'run' })).toBe('/run')
    expect(serializeBlock({ kind: 'text', text: 'x' })).toBe('x')
  })

  it('serializeRange handles single-block text slice', () => {
    expect(serializeRange(doc, { startBlock: 0, startOffset: 1, endBlock: 0, endOffset: 4 })).toBe('ey ')
  })

  it('serializeRange spans across atomic boundary', () => {
    const r = { startBlock: 0, startOffset: 4, endBlock: 2, endOffset: 4 }
    expect(serializeRange(doc, r)).toBe('@Bob run')
  })

  it('serializeRange empty for collapsed selection', () => {
    expect(serializeRange(doc, { startBlock: 0, startOffset: 0, endBlock: 0, endOffset: 0 })).toBe('')
  })
})
