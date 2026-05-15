import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isImeSafe, matches } from '@interactive-os/keyboard'
import type { JsonPatchOperation } from 'zod-crud'
import type {
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
  const compositionRange = useRef<ReturnType<typeof resolveDocumentRange> | null>(null)
  const ignoreNextInsertText = useRef<string | null>(null)
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

  const handleBeforeInput = useCallback((event: Event) => {
    const e = event as InputEvent
    const root = elRef.current
    const state = stateRef.current
    if (!root || state.readOnly) return
    const range = resolveDocumentRange(root)
    if (!range) return
    const { start } = orderedRange(range)
    if (composing.current || e.inputType === 'insertCompositionText') return
    if (e.inputType === 'insertText') {
      if (ignoreNextInsertText.current && ignoreNextInsertText.current === (e.data ?? '')) {
        ignoreNextInsertText.current = null
        e.preventDefault()
        return
      }
      ignoreNextInsertText.current = null
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
  }, [apply])

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
    if (!root || state.readOnly || !e.data) return
    const range = compositionRange.current
    compositionRange.current = null
    if (!range) return
    ignoreNextInsertText.current = e.data
    apply(replaceRangeTextOps(state.blocks, state.adapter, range, e.data))
  }, [apply])

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
