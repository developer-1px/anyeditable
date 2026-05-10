import { describe, expect, it } from 'vitest'
import { detectTrigger } from '../triggers.js'

const T = { '@': 'mention' as const, '/': 'command' as const }

describe('detectTrigger', () => {
  it('@ at start', () => {
    expect(detectTrigger('@bo', 3, T)).toEqual({ kind: 'mention', query: 'bo', startOffset: 0 })
  })
  it('@ after space', () => {
    expect(detectTrigger('hi @bo', 6, T)).toEqual({ kind: 'mention', query: 'bo', startOffset: 3 })
  })
  it('email-like @ rejected (no boundary before)', () => {
    expect(detectTrigger('a@b', 3, T)).toBeNull()
  })
  it('returns null without trigger', () => {
    expect(detectTrigger('hello', 5, T)).toBeNull()
  })
  it('cancels on whitespace after trigger', () => {
    expect(detectTrigger('@bob ok', 7, T)).toBeNull()
  })
  it('/ command', () => {
    expect(detectTrigger('/run', 4, T)).toEqual({ kind: 'command', query: 'run', startOffset: 0 })
  })
  it('minQueryLength=1: bare @ → null, @b → hint', () => {
    expect(detectTrigger('@', 1, T, 1)).toBeNull()
    expect(detectTrigger('@b', 2, T, 1)?.query).toBe('b')
  })
  it('minQueryLength=2: @b → null, @bo → hint', () => {
    expect(detectTrigger('@b', 2, T, 2)).toBeNull()
    expect(detectTrigger('@bo', 3, T, 2)?.query).toBe('bo')
  })
})
