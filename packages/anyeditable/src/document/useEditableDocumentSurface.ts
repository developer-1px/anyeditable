import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isIMESafe } from '@interactive-os/keyboard'
import type { JSONPatchOperation } from 'zod-crud'
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
  replaceRangeTextFromSnapshotOps,
  splitBlockOps,
} from './operations.js'
import { orderedRange, resolveDocumentRange, restoreDocumentPosition } from './selection.js'
import { toKeyInput } from '../keyboardInput.js'

export function useEditableDocumentSurface<TBlock>(
  options: UseEditableDocumentSurfaceOptions<TBlock>,
): UseEditableDocumentSurfaceReturn {
  const { blocks, adapter, ops, readOnly = false, placeholder, label, labelledBy, spellCheck } = options
  const elRef = useRef<HTMLElement | null>(null)
  const [el, setEl] = useState<HTMLElement | null>(null)
  const nativeComposing = useRef(false)
  const reconciliationLocked = useRef(false)
  const compositionTransaction = useRef<CompositionTransaction | null>(null)
  const compositionCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreNextNativeCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreNextNativeCommit = useRef<string | null>(null)
  const pendingSelection = useRef<DocumentPosition | null>(null)
  const stateRef = useRef({ blocks, adapter, ops, readOnly })
  Object.assign(stateRef.current, { blocks, adapter, ops, readOnly })

  const containerRef = useCallback((nextEl: HTMLElement | null) => {
    elRef.current = nextEl
    setEl(nextEl)
  }, [])
  useDocumentReconciler(elRef, blocks, adapter, pendingSelection, reconciliationLocked)

  const apply = useCallback((result: { patches: JSONPatchOperation[]; caret: DocumentPosition }) => {
    if (result.patches.length === 0) return
    pendingSelection.current = result.caret
    stateRef.current.ops.apply(result.patches)
  }, [])

  const armIgnoreNextNativeCommit = useCallback((text: string) => {
    ignoreNextNativeCommit.current = text
    if (ignoreNextNativeCommitTimer.current) clearTimeout(ignoreNextNativeCommitTimer.current)
    ignoreNextNativeCommitTimer.current = setTimeout(() => {
      ignoreNextNativeCommit.current = null
      ignoreNextNativeCommitTimer.current = null
    }, 50)
  }, [])

  const commitComposition = useCallback((transaction: CompositionTransaction, text: string) => {
    if (!text) return false
    if (compositionCommitTimer.current) {
      clearTimeout(compositionCommitTimer.current)
      compositionCommitTimer.current = null
    }
    armIgnoreNextNativeCommit(text)
    compositionTransaction.current = null
    nativeComposing.current = false
    reconciliationLocked.current = false
    apply(replaceRangeTextFromSnapshotOps(stateRef.current.adapter, transaction.range, transaction.baseText, text))
    return true
  }, [apply, armIgnoreNextNativeCommit])

  const flushPendingComposition = useCallback((root: HTMLElement): boolean => {
    const transaction = compositionTransaction.current
    if (!transaction || transaction.status !== 'committing') return false
    return commitComposition(transaction, transaction.text ?? readComposedText(root, transaction))
  }, [commitComposition])

  const ensureCompositionTransaction = useCallback((root: HTMLElement): CompositionTransaction | null => {
    if (compositionTransaction.current) {
      if (compositionTransaction.current.status !== 'committing') return compositionTransaction.current
      flushPendingComposition(root)
    }
    const range = resolveDocumentRange(root)
    if (!range) return null
    const { start } = orderedRange(range)
    const block = stateRef.current.blocks[start.blockIndex]
    const blockEl = root.querySelector(`[data-doc-block-index="${start.blockIndex}"]`)
    const baseText = blockEl?.textContent ?? (block ? stateRef.current.adapter.getText(block, start.blockIndex) : '')
    const transaction: CompositionTransaction = { status: 'composing', range, blockIndex: start.blockIndex, baseText }
    compositionTransaction.current = transaction
    reconciliationLocked.current = true
    return transaction
  }, [flushPendingComposition])

  const scheduleCompositionCommit = useCallback((transaction: CompositionTransaction, text?: string) => {
    if (compositionCommitTimer.current) clearTimeout(compositionCommitTimer.current)
    transaction.status = 'committing'
    if (text) transaction.text = text
    compositionCommitTimer.current = setTimeout(() => {
      compositionCommitTimer.current = null
      const pending = compositionTransaction.current
      const root = elRef.current
      if (!pending || !root) return
      const fallbackText = pending.text ?? readComposedText(root, pending)
      commitComposition(pending, fallbackText)
    }, 0)
  }, [commitComposition])

  const handleBeforeInput = useCallback((event: Event) => {
    const e = event as InputEvent
    const root = elRef.current
    const state = stateRef.current
    if (!root || state.readOnly) return
    const range = resolveDocumentRange(root)
    if (!range) return
    const { start } = orderedRange(range)
    if (nativeComposing.current || e.isComposing) {
      if (e.inputType === 'insertCompositionText') {
        ensureCompositionTransaction(root)
      }
      return
    }
    if (e.inputType === 'insertCompositionText') {
      const transaction = compositionTransaction.current
      if (transaction?.status === 'committing') {
        e.preventDefault()
        commitComposition(transaction, e.data ?? transaction.text ?? readComposedText(root, transaction))
        return
      }
      if (ignoreNextNativeCommit.current && ignoreNextNativeCommit.current === (e.data ?? '')) {
        ignoreNextNativeCommit.current = null
        e.preventDefault()
      }
      return
    }
    if (e.inputType === 'insertText') {
      const transaction = compositionTransaction.current
      if (transaction?.status === 'committing') {
        e.preventDefault()
        commitComposition(transaction, e.data ?? transaction.text ?? readComposedText(root, transaction))
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
  }, [apply, commitComposition, ensureCompositionTransaction])

  const handleInput = useCallback((event: Event) => {
    const e = event as InputEvent
    const root = elRef.current
    const transaction = compositionTransaction.current
    if (!root || !transaction) return
    if (e.inputType !== 'insertCompositionText' && e.inputType !== 'insertText') return
    const text = e.data ?? readComposedText(root, transaction)
    if (transaction.status === 'committing') scheduleCompositionCommit(transaction, text)
  }, [scheduleCompositionCommit])

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
    nativeComposing.current = false
    const root = elRef.current
    const state = stateRef.current
    const transaction = root ? ensureCompositionTransaction(root) : compositionTransaction.current
    if (!root || state.readOnly || !transaction) return
    scheduleCompositionCommit(transaction, e.data || undefined)
  }, [ensureCompositionTransaction, scheduleCompositionCommit])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const root = elRef.current
    const state = stateRef.current
    if (!root || state.readOnly) return
    const key = toKeyInput(e, { isComposing: nativeComposing.current || reconciliationLocked.current })
    if (!isIMESafe(key)) return
  }, [])

  useLayoutEffect(() => {
    if (!el) return
    const onCompositionStart = () => {
      nativeComposing.current = true
      ensureCompositionTransaction(el)
    }
    el.addEventListener('beforeinput', handleBeforeInput)
    el.addEventListener('input', handleInput)
    el.addEventListener('paste', handlePaste)
    el.addEventListener('compositionstart', onCompositionStart)
    el.addEventListener('compositionend', handleCompositionEnd)
    return () => {
      el.removeEventListener('beforeinput', handleBeforeInput)
      el.removeEventListener('input', handleInput)
      el.removeEventListener('paste', handlePaste)
      el.removeEventListener('compositionstart', onCompositionStart)
      el.removeEventListener('compositionend', handleCompositionEnd)
      if (compositionCommitTimer.current) {
        clearTimeout(compositionCommitTimer.current)
        compositionCommitTimer.current = null
      }
      if (ignoreNextNativeCommitTimer.current) {
        clearTimeout(ignoreNextNativeCommitTimer.current)
        ignoreNextNativeCommitTimer.current = null
      }
    }
  }, [el, ensureCompositionTransaction, handleBeforeInput, handleCompositionEnd, handleInput, handlePaste])

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
  EditableDocumentOps,
  UseEditableDocumentSurfaceOptions,
  UseEditableDocumentSurfaceReturn,
} from './types.js'

interface CompositionTransaction {
  status: 'composing' | 'committing'
  range: DocumentRange
  blockIndex: number
  baseText: string
  text?: string
}

function readComposedText(
  root: HTMLElement,
  transaction: CompositionTransaction,
): string {
  const { range, baseText } = transaction
  const start = orderedRange(range).start
  const end = orderedRange(range).end
  if (start.blockIndex !== end.blockIndex) return ''
  const el = root.querySelector(`[data-doc-block-index="${start.blockIndex}"]`)
  if (!el) return ''
  const domText = el.textContent ?? ''
  const prefix = baseText.slice(0, start.offset)
  const suffix = baseText.slice(end.offset)
  if (!domText.startsWith(prefix) || !domText.endsWith(suffix)) return ''
  return domText.slice(prefix.length, domText.length - suffix.length)
}
