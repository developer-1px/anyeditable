import { useCallback, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import type { AtomicKind, Block, ComposerDoc } from './schema.js'
import type { TriggerHint } from './triggers.js'
import { commitAtomicPatch, type Patch } from './blockOps.js'
import { useDomBridge } from './useDomBridge.js'
import { useDocReconciler, type CaretPos } from './useDocReconciler.js'
import { useComposerKeys } from './composerKeys.js'
import { useClipboard } from './useClipboard.js'
import { useAutoFocus } from './useAutoFocus.js'
import { buildContainerProps } from './containerProps.js'
import { serialize } from './serialize.js'

export interface JsonOps { apply(patches: readonly Patch[]): void }

export interface TriggerState extends TriggerHint { blockIdx: number }

export interface UseEditableComposerOptions {
  doc: ComposerDoc
  ops: JsonOps
  triggers: Record<string, AtomicKind>
  /** Atomic 블록 렌더 콜백 — DecoratorNode-equivalent. createPortal 로 contentEditable=false span 안에 마운트. */
  renderAtomic?: (block: Block) => ReactNode
  minQueryLength?: number
  multiline?: boolean
  readOnly?: boolean
  placeholder?: string
  maxLength?: number
  autoFocus?: boolean
  spellCheck?: boolean
  onSubmit?: (payload: { doc: ComposerDoc; text: string }) => void
  onUndo?: () => boolean | void
  onRedo?: () => boolean | void
}

export interface UseEditableComposerReturn {
  /** Container ref — 호스트는 `<div ref={c.containerRef} />` 한 줄만. 내부 DOM 은 reconciler 가 소유. */
  containerRef: (el: HTMLElement | null) => void
  /** Atomic block portals — 호스트 트리에 그대로 렌더 (e.g. `<>{c.portals}</>`). */
  portals: ReactNode[]
  /** Container 에 spread 할 ARIA/contentEditable/이벤트 props. */
  containerProps: HTMLAttributes<HTMLElement>
  trigger: TriggerState | null
  commitAtomic: (atomic: Block) => void
  cancelTrigger: () => void
}

export function useEditableComposer(opts: UseEditableComposerOptions): UseEditableComposerReturn {
  const { doc, ops, triggers, renderAtomic, onSubmit, onUndo, onRedo, minQueryLength = 0, multiline = true, readOnly = false, placeholder, maxLength, autoFocus = false, spellCheck } = opts
  const [trigger, setTrigger] = useState<TriggerState | null>(null)
  const composing = useRef(false)
  const caret = useRef<CaretPos>({ blockIdx: 0, offset: 0 })
  const pendingCaret = useRef<CaretPos | null>(null)
  const elRef = useRef<HTMLElement | null>(null)
  const stateRef = useRef({ doc, ops, triggers, minQueryLength, readOnly, maxLength })
  Object.assign(stateRef.current, { doc, ops, triggers, minQueryLength, readOnly, maxLength })

  const setRef = useCallback((el: HTMLElement | null) => { elRef.current = el }, [])
  useDomBridge({ el: elRef, caret, pendingCaret, composing, state: stateRef }, setTrigger)
  const docRef = useRef(doc); docRef.current = doc
  const opsRef = useRef(ops); opsRef.current = ops
  useClipboard(elRef, docRef, opsRef)
  const onKeyDown = useComposerKeys({ composing, trigger, setTrigger, submit: makeSubmit(doc, onSubmit), onUndo, onRedo })

  const portals = useDocReconciler(elRef, doc, renderAtomic, pendingCaret)

  const commitAtomic = useCallback((atomic: Block) => {
    if (!trigger) return
    ops.apply(commitAtomicPatch(doc.blocks, trigger.blockIdx, trigger.startOffset, caret.current.offset, atomic))
    const next = { blockIdx: trigger.blockIdx + 2, offset: 0 }
    caret.current = next
    pendingCaret.current = next
    setTrigger(null)
  }, [doc, ops, trigger])

  useAutoFocus(elRef, autoFocus)

  const cancelTrigger = useCallback(() => setTrigger(null), [])

  const containerProps = useMemo(
    () => buildContainerProps({ multiline, readOnly, placeholder, spellCheck, onKeyDown }),
    [readOnly, multiline, placeholder, spellCheck, onKeyDown],
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

