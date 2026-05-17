import type { DOMBridgeRefs } from '../bridgeHandlers.js'
import { EMPTY_DOC, type ComposerDoc } from '../schema.js'

export function refs(overrides: Partial<DOMBridgeRefs['state']['current']> = {}): DOMBridgeRefs & { applied: unknown[] } {
  const applied: unknown[] = []
  const state = {
    doc: EMPTY_DOC as ComposerDoc,
    ops: { apply: (p: unknown) => { applied.push(p) } },
    triggers: { '@': 'mention' as const },
    minQueryLength: 0,
    readOnly: false,
    multiline: true,
    maxLength: undefined as number | undefined,
    dismissed: null as { blockIdx: number; startOffset: number } | null,
    ...overrides,
  }
  return {
    el: { current: null },
    caret: { current: { blockIdx: 0, offset: 0 } },
    pendingCaret: { current: null },
    composing: { current: false },
    state: { current: state },
    applied,
  }
}

export function el(): HTMLElement {
  const d = document.createElement('div')
  document.body.appendChild(d)
  return d
}

export function fakeIE(inputType: string, data?: string): InputEvent {
  const ev = new Event(inputType) as unknown as InputEvent
  Object.defineProperty(ev, 'inputType', { value: inputType })
  Object.defineProperty(ev, 'data', { value: data ?? null })
  return ev
}
