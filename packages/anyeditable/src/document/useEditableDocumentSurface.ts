import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isImeSafe, matches } from '@interactive-os/keyboard'
import type { JsonPatchOperation } from 'zod-crud'
import type {
  DocumentRange,
  DocumentPosition,
  UseEditableDocumentSurfaceOptions,
  UseEditableDocumentSurfaceReturn,
} from './types.js'
import { useDocumentReconciler } from './reconciler.js'
import {
  deleteBackwardOps,
  deleteForwardOps,
  insertTextOps,
  pasteTextOps,
  replaceRangeTextOps,
  splitBlockOps,
  toggleMarkOps,
} from './operations.js'
import { orderedRange, resolveDocumentRange, restoreDocumentPosition } from './selection.js'
import { toKeyInput } from '../keyboardInput.js'

export function useEditableDocumentSurface<TBlock>(
  options: UseEditableDocumentSurfaceOptions<TBlock>,
): UseEditableDocumentSurfaceReturn {
  const { blocks, adapter, ops, readOnly = false, placeholder, label, labelledBy, spellCheck } = options
  const elRef = useRef<HTMLElement | null>(null)
  const [el, setEl] = useState<HTMLElement | null>(null)
  const composing = useRef(false)
  const compositionRange = useRef<DocumentRange | null>(null)
  const pendingCompositionCommit = useRef<{ range: DocumentRange; text?: string } | null>(null)
  const ignoreNextNativeCommit = useRef<string | null>(null)
  const pendingSelection = useRef<DocumentPosition | null>(null)
  const stateRef = useRef({ blocks, adapter, ops, readOnly })
  Object.assign(stateRef.current, { blocks, adapter, ops, readOnly })

  const containerRef = useCallback((nextEl: HTMLElement | null) => {
    elRef.current = nextEl
    setEl(nextEl)
  }, [])
  useDocumentReconciler(elRef, blocks, adapter, pendingSelection, composing)

  const apply = useCallback((result: { patches: JsonPatchOperation[]; caret: DocumentPosition }) => {
    if (result.patches.length === 0) return
    pendingSelection.current = result.caret
    stateRef.current.ops.apply(result.patches)
  }, [])

  const commitComposition = useCallback((range: DocumentRange, text: string) => {
    if (!text) return false
    ignoreNextNativeCommit.current = text
    pendingCompositionCommit.current = null
    apply(replaceRangeTextOps(stateRef.current.blocks, stateRef.current.adapter, range, text))
    return true
  }, [apply])

  const handleBeforeInput = useCallback((event: Event) => {
    const e = event as InputEvent
    const root = elRef.current
    const state = stateRef.current
    if (!root || state.readOnly) return
    const range = resolveDocumentRange(root)
    if (!range) return
    const { start } = orderedRange(range)
    if (composing.current) return
    if (e.inputType === 'insertCompositionText') {
      if (pendingCompositionCommit.current) {
        e.preventDefault()
        commitComposition(pendingCompositionCommit.current.range, e.data ?? pendingCompositionCommit.current.text ?? '')
        return
      }
      if (ignoreNextNativeCommit.current && ignoreNextNativeCommit.current === (e.data ?? '')) {
        ignoreNextNativeCommit.current = null
        e.preventDefault()
      }
      return
    }
    if (e.inputType === 'insertText') {
      if (pendingCompositionCommit.current) {
        e.preventDefault()
        commitComposition(pendingCompositionCommit.current.range, e.data ?? pendingCompositionCommit.current.text ?? '')
        return
      }
      if (ignoreNextNativeCommit.current && ignoreNextNativeCommit.current === (e.data ?? '')) {
        ignoreNextNativeCommit.current = null
        e.preventDefault()
        return
      }
      ignoreNextNativeCommit.current = null
      e.preventDefault()
      apply(insertTextOps(state.blocks, state.adapter, start, e.data ?? ''))
    } else if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
      e.preventDefault()
      apply(splitBlockOps(state.blocks, state.adapter, start))
    } else if (e.inputType === 'deleteContentBackward') {
      e.preventDefault()
      apply(deleteBackwardOps(state.blocks, state.adapter, start))
    } else if (e.inputType === 'deleteContentForward') {
      e.preventDefault()
      apply(deleteForwardOps(state.blocks, state.adapter, start))
    } else if (e.inputType === 'insertFromPaste') {
      const text = (e as InputEvent & { dataTransfer?: DataTransfer }).dataTransfer?.getData('text/plain') ?? e.data ?? ''
      e.preventDefault()
      apply(pasteTextOps(state.blocks, state.adapter, start, text))
    }
  }, [apply, commitComposition])

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const root = elRef.current
    const state = stateRef.current
    if (!root || state.readOnly) return
    const range = resolveDocumentRange(root)
    if (!range) return
    e.preventDefault()
    apply(pasteTextOps(state.blocks, state.adapter, orderedRange(range).start, e.clipboardData?.getData('text/plain') ?? ''))
  }, [apply])

  const handleCompositionEnd = useCallback((e: CompositionEvent) => {
    composing.current = false
    const root = elRef.current
    const state = stateRef.current
    const range = compositionRange.current
    compositionRange.current = null
    if (!root || state.readOnly || !range) return
    pendingCompositionCommit.current = e.data ? { range, text: e.data } : { range }
    if (!e.data) return
    commitComposition(range, e.data)
  }, [commitComposition])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const root = elRef.current
    const state = stateRef.current
    if (!root || state.readOnly) return
    const key = toKeyInput(e, { isComposing: composing.current })
    if (!isImeSafe(key)) return
    if (matches(key, 'Control+b Meta+b Control+B Meta+B')) {
      const range = resolveDocumentRange(root)
      if (!range) return
      const { start, end } = orderedRange(range)
      if (start.blockIndex !== end.blockIndex || start.offset === end.offset) return
      e.preventDefault()
      state.ops.apply(toggleMarkOps(state.blocks, state.adapter, start.blockIndex, start.offset, end.offset, 'bold'))
    }
  }, [])

  useLayoutEffect(() => {
    if (!el) return
    const onCompositionStart = () => {
      composing.current = true
      compositionRange.current = resolveDocumentRange(el)
    }
    el.addEventListener('beforeinput', handleBeforeInput)
    el.addEventListener('paste', handlePaste)
    el.addEventListener('compositionstart', onCompositionStart)
    el.addEventListener('compositionend', handleCompositionEnd)
    return () => {
      el.removeEventListener('beforeinput', handleBeforeInput)
      el.removeEventListener('paste', handlePaste)
      el.removeEventListener('compositionstart', onCompositionStart)
      el.removeEventListener('compositionend', handleCompositionEnd)
    }
  }, [el, handleBeforeInput, handleCompositionEnd, handlePaste])

  const containerProps = useMemo(() => ({
    role: 'textbox',
    'aria-multiline': true,
    'aria-label': label,
    'aria-labelledby': labelledBy,
    'data-placeholder': placeholder,
    contentEditable: !readOnly,
    suppressContentEditableWarning: true,
    spellCheck,
    onKeyDown,
  }), [label, labelledBy, onKeyDown, placeholder, readOnly, spellCheck])

  const getSelection = useCallback(() => {
    const root = elRef.current
    return root ? resolveDocumentRange(root) : null
  }, [])

  const setSelection = useCallback((position: DocumentPosition) => {
    const root = elRef.current
    if (root) restoreDocumentPosition(root, position)
  }, [])

  return { containerRef, containerProps, portals: [] as ReactNode[], getSelection, setSelection }
}

export type {
  DocumentPosition,
  DocumentRange,
  EditableDocumentBlockAdapter,
  EditableDocumentBlockKind,
  EditableDocumentMark,
  EditableDocumentMarkKind,
  EditableDocumentOps,
  UseEditableDocumentSurfaceOptions,
  UseEditableDocumentSurfaceReturn,
} from './types.js'
