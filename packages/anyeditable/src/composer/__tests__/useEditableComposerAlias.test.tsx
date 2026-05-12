import { describe, expect, it } from 'vitest'
import { useEditableComposer } from '../useEditableComposer.js'
import { useEditableSurface } from '../useEditableSurface.js'

describe('useEditableComposer legacy alias', () => {
  it('points to useEditableSurface', () => {
    expect(useEditableComposer).toBe(useEditableSurface)
  })
})
