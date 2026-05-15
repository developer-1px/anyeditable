import type { KeyboardEvent } from 'react'
import type { KeyInput } from '@interactive-os/keyboard'

export function toKeyInput(e: KeyboardEvent, overrides: Partial<Pick<KeyInput, 'isComposing'>> = {}): KeyInput {
  const ne = (e.nativeEvent ?? {}) as KeyboardEventInit & { isComposing?: boolean; keyCode?: number }
  const legacy = e as KeyboardEvent & { keyCode?: number }
  const input: KeyInput = {
    key: e.key,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    metaKey: e.metaKey,
  }

  const isComposing = overrides.isComposing ?? ne.isComposing
  if (isComposing !== undefined) input.isComposing = isComposing
  if (e.repeat !== undefined) input.repeat = e.repeat
  if (e.location !== undefined) input.location = e.location
  if (e.code !== undefined) input.code = e.code
  const keyCode = ne.keyCode ?? legacy.keyCode
  if (keyCode !== undefined) input.keyCode = keyCode
  if (typeof e.getModifierState === 'function') {
    input.getModifierState = (key: string) => e.getModifierState(key as Parameters<typeof e.getModifierState>[0])
  }

  return input
}
