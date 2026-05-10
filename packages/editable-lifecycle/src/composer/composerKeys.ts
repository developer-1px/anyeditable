import { useCallback } from 'react'
import type { KeyboardEvent } from 'react'

export interface KeyOpts {
  composing: { current: boolean }
  trigger: unknown
  setTrigger: (t: null) => void
  onSubmit: (() => void) | undefined
  onUndo: (() => boolean | void) | undefined
  onRedo: (() => boolean | void) | undefined
}

/** Composer 키 핸들러 — Cmd/Ctrl+Z undo/redo, Enter submit, Esc cancel trigger. */
export function useComposerKeys(opts: KeyOpts) {
  const { composing, trigger, setTrigger, onSubmit, onUndo, onRedo } = opts
  return useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.defaultPrevented) return
    const mod = e.metaKey || e.ctrlKey
    if (mod && (e.key === 'z' || e.key === 'Z')) {
      const handler = e.shiftKey ? onRedo : onUndo
      if (handler) { e.preventDefault(); handler() }
      return
    }
    if (e.key === 'Enter' && !e.shiftKey && !composing.current) { e.preventDefault(); onSubmit?.() }
    else if (e.key === 'Escape' && trigger) { e.preventDefault(); setTrigger(null) }
  }, [composing, trigger, setTrigger, onSubmit, onUndo, onRedo])
}
