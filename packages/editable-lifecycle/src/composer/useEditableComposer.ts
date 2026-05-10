import { useCallback, useMemo, useRef, useState } from 'react'
import type { HTMLAttributes } from 'react'
import type { AtomicKind, Block, ComposerDoc } from './schema.js'
import type { TriggerHint } from './triggers.js'
import { commitAtomicPatch, type Patch } from './blockOps.js'
import { useDomBridge } from './useDomBridge.js'
import { usePendingCaret } from './usePendingCaret.js'
import { useComposerKeys } from './composerKeys.js'
import { useClipboard } from './useClipboard.js'

export interface JsonOps {
  apply(patches: readonly Patch[]): void
}

export interface TriggerState extends TriggerHint {
  blockIdx: number
}

export interface UseEditableComposerOptions {
  doc: ComposerDoc
  ops: JsonOps
  triggers: Record<string, AtomicKind>
  minQueryLength?: number  // popover 표시 전 query 최소 길이 (default 0)
  multiline?: boolean  // aria-multiline (default true — Shift+Enter 줄바꿈 지원)
  readOnly?: boolean  // contentEditable=false + skip beforeinput patches
  placeholder?: string  // data-placeholder attr — CSS `:empty::before { content: attr(data-placeholder) }`
  maxLength?: number  // total text length cap; inserts clipped (atomics counted as 1)
  onSubmit?: () => void
  onUndo?: () => boolean | void  // Cmd/Ctrl+Z
  onRedo?: () => boolean | void  // Cmd/Ctrl+Shift+Z
}

export interface UseEditableComposerReturn {
  rootProps: HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void }
  /** 모든 block 에 spread (text + atomic). data-block-index/kind — resolveCaret 의 SSOT. */
  blockProps: (blockIndex: number) => HTMLAttributes<HTMLElement>
  /** atomic block 전용 — contenteditable=false + aria-label. blockProps 와 함께 spread. */
  atomicProps: (blockIndex: number) => HTMLAttributes<HTMLElement>
  trigger: TriggerState | null
  commitAtomic: (atomic: Block) => void
  cancelTrigger: () => void
}

export function useEditableComposer(opts: UseEditableComposerOptions): UseEditableComposerReturn {
  const { doc, ops, triggers, onSubmit, onUndo, onRedo, minQueryLength = 0, multiline = true, readOnly = false, placeholder, maxLength } = opts
  const [trigger, setTrigger] = useState<TriggerState | null>(null)
  const composing = useRef(false)
  const caret = useRef({ blockIdx: 0, offset: 0 })
  const pendingCaret = useRef<{ blockIdx: number; offset: number } | null>(null)
  const elRef = useRef<HTMLElement | null>(null)
  const stateRef = useRef({ doc, ops, triggers, minQueryLength, readOnly, maxLength })
  Object.assign(stateRef.current, { doc, ops, triggers, minQueryLength, readOnly, maxLength })

  useDomBridge({ el: elRef, caret, composing, state: stateRef }, setTrigger)
  const docRef = useRef(doc); docRef.current = doc
  useClipboard(elRef, docRef)

  const onKeyDown = useComposerKeys({ composing, trigger, setTrigger, onSubmit, onUndo, onRedo })

  const commitAtomic = useCallback((atomic: Block) => {
    if (!trigger) return
    ops.apply(commitAtomicPatch(doc.blocks, trigger.blockIdx, trigger.startOffset, caret.current.offset, atomic))
    const next = { blockIdx: trigger.blockIdx + 2, offset: 0 }
    caret.current = next
    pendingCaret.current = next
    setTrigger(null)
  }, [doc, ops, trigger])

  usePendingCaret(elRef, pendingCaret)

  const cancelTrigger = useCallback(() => setTrigger(null), [])

  const rootProps = useMemo(() => ({
    ref: (el: HTMLElement | null) => { elRef.current = el },
    contentEditable: !readOnly,
    role: 'textbox',
    'aria-multiline': multiline,
    'aria-readonly': readOnly || undefined,
    'aria-placeholder': placeholder,
    'data-placeholder': placeholder,
    suppressContentEditableWarning: true,
    onKeyDown,
  }) as HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void }, [onKeyDown, multiline, readOnly, placeholder])

  const blockProps = useCallback((i: number): HTMLAttributes<HTMLElement> => {
    const b = doc.blocks[i]
    return { 'data-block-index': i, 'data-block-kind': b?.kind } as HTMLAttributes<HTMLElement>
  }, [doc])

  const atomicProps = useCallback((i: number): HTMLAttributes<HTMLElement> => {
    const b = doc.blocks[i]
    return {
      contentEditable: false,
      'aria-label': b?.kind === 'mention' ? b.label : b?.kind === 'command' ? '/' + b.name : undefined,
    } as HTMLAttributes<HTMLElement>
  }, [doc])

  return { rootProps, blockProps, atomicProps, trigger, commitAtomic, cancelTrigger }
}
