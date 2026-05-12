import { describe, it, expect } from 'vitest'
import { buildContainerProps } from '../containerProps.js'

const noop = () => {}

describe('buildContainerProps', () => {
  it('contentEditable false when readOnly', () => {
    const p = buildContainerProps({ multiline: true, readOnly: true, placeholder: undefined, label: undefined, labelledBy: undefined, spellCheck: undefined, onKeyDown: noop })
    expect(p.contentEditable).toBe(false)
    expect(p['aria-readonly']).toBe(true)
  })

  it('contentEditable true + aria-readonly undefined when editable', () => {
    const p = buildContainerProps({ multiline: true, readOnly: false, placeholder: undefined, label: undefined, labelledBy: undefined, spellCheck: undefined, onKeyDown: noop })
    expect(p.contentEditable).toBe(true)
    expect(p['aria-readonly']).toBeUndefined()
  })

  it('aria-multiline reflects multiline', () => {
    expect(buildContainerProps({ multiline: false, readOnly: false, placeholder: undefined, label: undefined, labelledBy: undefined, spellCheck: undefined, onKeyDown: noop })['aria-multiline']).toBe(false)
    expect(buildContainerProps({ multiline: true, readOnly: false, placeholder: undefined, label: undefined, labelledBy: undefined, spellCheck: undefined, onKeyDown: noop })['aria-multiline']).toBe(true)
  })

  it('placeholder mirrored to aria-placeholder and data-placeholder', () => {
    const p = buildContainerProps({ multiline: true, readOnly: false, placeholder: 'Say hi', label: undefined, labelledBy: undefined, spellCheck: undefined, onKeyDown: noop })
    expect(p['aria-placeholder']).toBe('Say hi')
    expect((p as Record<string, unknown>)['data-placeholder']).toBe('Say hi')
  })

  it('label / labelledBy threaded to aria-* attrs', () => {
    const p = buildContainerProps({ multiline: true, readOnly: false, placeholder: undefined, label: 'Message', labelledBy: 'msg-label', spellCheck: undefined, onKeyDown: noop })
    expect(p['aria-label']).toBe('Message')
    expect(p['aria-labelledby']).toBe('msg-label')
  })

  it('role is textbox', () => {
    const p = buildContainerProps({ multiline: true, readOnly: false, placeholder: undefined, label: undefined, labelledBy: undefined, spellCheck: undefined, onKeyDown: noop })
    expect(p.role).toBe('textbox')
  })
})
