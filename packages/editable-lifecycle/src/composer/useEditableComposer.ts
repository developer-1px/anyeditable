import { useCallback, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import type { AtomicKind, Block, ComposerDoc } from './schema.js'
import type { TriggerHint } from './triggers.js'
import { commitAtomicPatch, type Patch } from './blockOps.js'
import { useDomBridge } from './useDomBridge.js'
import { useDocReconciler, type CaretPos } from './useDocReconciler.js'
import { useComposerKeys } from './composerKeys.js'
import { useClipboard } from './useClipboard.js'
import { useAutoFocus } from './useAutoFocus.js'
import { useSyncDocOps } from './syncDocOps.js'
import { buildContainerProps } from './containerProps.js'
import { serialize } from './serialize.js'

export interface JsonOps { apply(patches: readonly Patch[]): void }

export interface TriggerState extends TriggerHint { blockIdx: number }

export interface UseEditableComposerOptions {
  doc: ComposerDoc
  ops: JsonOps
  triggers: Record<string, AtomicKind>
  /** Atomic render callback — DecoratorNode-equivalent (createPortal into contentEditable=false). */
  renderAtomic?: (block: Block) => ReactNode
  minQueryLength?: number
  multiline?: boolean
  readOnly?: boolean
  placeholder?: string
  /** aria-label for the textbox (accessible name). Prefer labelledBy if a visible label exists. */
  label?: string
  labelledBy?: string
  maxLength?: number
  autoFocus?: boolean
  spellCheck?: boolean
  onSubmit?: (payload: { doc: ComposerDoc; text: string }) => void
  onUndo?: () => boolean | void
  onRedo?: () => boolean | void
}

export interface UseEditableComposerReturn {
  containerRef: (el: HTMLElement | null) => void
  portals: ReactNode[]
  containerProps: HTMLAttributes<HTMLElement>
  trigger: TriggerState | null
  commitAtomic: (atomic: Block) => void
  cancelTrigger: () => void
}

export function useEditableComposer(o: UseEditableComposerOptions): UseEditableComposerReturn {
  const { doc, ops, triggers, renderAtomic, onSubmit, onUndo, onRedo, minQueryLength = 0, multiline = true, readOnly = false, autoFocus = false, placeholder, label, labelledBy, maxLength, spellCheck } = o
  const [trigger, setTrigger] = useState<TriggerState | null>(null)
  const composing = useRef(false)
  const caret = useRef<CaretPos>({ blockIdx: 0, offset: 0 })
  const pendingCaret = useRef<CaretPos | null>(null)
  const elRef = useRef<HTMLElement | null>(null)
  const stateRef = useRef({ doc, ops, triggers, minQueryLength, readOnly, maxLength, dismissed: null as { blockIdx: number; startOffset: number } | null })
  Object.assign(stateRef.current, { doc, triggers, minQueryLength, readOnly, maxLength })
  stateRef.current.ops = useSyncDocOps(ops, stateRef)

  const setRef = useCallback((el: HTMLElement | null) => { elRef.current = el }, [])
  useDomBridge({ el: elRef, caret, pendingCaret, composing, state: stateRef }, setTrigger)
  const docRef = useRef(doc); docRef.current = doc
  const opsRef = useRef<JsonOps>(stateRef.current.ops); opsRef.current = stateRef.current.ops
  useClipboard(elRef, docRef, opsRef)
  const onKeyDown = useComposerKeys({ composing, trigger, setTrigger, submit: makeSubmit(doc, onSubmit), onUndo, onRedo })

  const portals = useDocReconciler(elRef, doc, renderAtomic, pendingCaret)

  const commitAtomic = useCallback((atomic: Block) => {
    if (!trigger) return
    // wrappedOps via stateRef so the sync doc snapshot advances post-commit.
    stateRef.current.ops.apply(commitAtomicPatch(doc.blocks, trigger.blockIdx, trigger.startOffset, caret.current.offset, atomic))
    const next = { blockIdx: trigger.blockIdx + 2, offset: 0 }
    caret.current = next
    pendingCaret.current = next
    setTrigger(null)
  }, [doc, trigger])

  useAutoFocus(elRef, autoFocus)

  const cancelTrigger = useCallback(() => {
    if (trigger) stateRef.current.dismissed = { blockIdx: trigger.blockIdx, startOffset: trigger.startOffset }
    setTrigger(null) }, [trigger])

  const containerProps = useMemo(
    () => buildContainerProps({ multiline, readOnly, placeholder, label, labelledBy, spellCheck, onKeyDown }),
    [readOnly, multiline, placeholder, label, labelledBy, spellCheck, onKeyDown],
  )

  return { containerRef: setRef, portals, containerProps, trigger, commitAtomic, cancelTrigger }
}

function makeSubmit(doc: ComposerDoc, onSubmit?: UseEditableComposerOptions['onSubmit']): (() => void) | undefined {
  if (!onSubmit) return undefined
  return () => {
    const text = serialize(doc)
    if (!text) return
    onSubmit({ doc, text })
  }
}

