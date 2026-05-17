import { useCallback } from 'react'
import type { KeyboardEvent } from 'react'
import { isIMESafe, matchesShortcut } from '@interactive-os/keyboard'
import { toKeyInput } from '../keyboardInput.js'

export interface KeyOpts {
  composing: { current: boolean }
  trigger: unknown
  /** Cancels the trigger AND records dismissed state so typing more does not reopen. */
  cancelTrigger: () => void
  submit: (() => void) | undefined
  onUndo: (() => boolean | void) | undefined
  onRedo: (() => boolean | void) | undefined
}

/** Composer 키 핸들러 — Cmd/Ctrl+Z undo/redo, Enter submit, Esc cancel trigger. */
export function useComposerKeys(opts: KeyOpts) {
  const { composing, trigger, cancelTrigger, submit, onUndo, onRedo } = opts
  return useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.defaultPrevented) return
    const key = toKeyInput(e, { isComposing: composing.current })
    if (!isIMESafe(key)) return
    if (matchesShortcut(key, 'Control+z Meta+z Control+Z Meta+Z Control+Shift+z Meta+Shift+z Control+Shift+Z Meta+Shift+Z')) {
      const handler = key.shiftKey ? onRedo : onUndo
      if (handler) { e.preventDefault(); handler() }
      return
    }
    if (matchesShortcut(key, 'Enter')) { e.preventDefault(); submit?.() }
    else if (matchesShortcut(key, 'Escape') && trigger) { e.preventDefault(); cancelTrigger() }
  }, [composing, trigger, cancelTrigger, submit, onUndo, onRedo])
}
