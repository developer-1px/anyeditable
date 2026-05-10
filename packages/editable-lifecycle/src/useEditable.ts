import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ChangeEvent, CompositionEvent, FocusEvent, RefCallback } from 'react'

export type NavDir = 'down' | 'up' | 'left' | 'right'

export interface UseEditableOptions<TId> {
  getValue: (id: TId) => string
  onCommit: (id: TId, next: string) => void
  /** Return next id given direction, or null to stop. Omit to disable navigate-after-commit. */
  onNavigate?: (id: TId, dir: NavDir) => TId | null
  /** Initial focused id. */
  initialFocus?: TId | null
  /** Map keys to navigation directions on commit. Default: Enter=down, Tab=right, Shift+Tab=left, Shift+Enter=up. */
  commitKeyMap?: (e: KeyboardEvent) => NavDir | 'commit-stay' | null
}

type EditableEl = HTMLInputElement | HTMLTextAreaElement

export interface InputProps {
  ref: RefCallback<EditableEl>
  value: string
  onChange: (e: ChangeEvent<EditableEl>) => void
  onKeyDown: (e: KeyboardEvent<EditableEl>) => void
  onCompositionStart: (e: CompositionEvent<EditableEl>) => void
  onCompositionEnd: (e: CompositionEvent<EditableEl>) => void
  onBlur: (e: FocusEvent<EditableEl>) => void
}

export type CaretMode = 'end' | 'start' | 'select-all' | 'preserve'

const defaultCommitKeyMap = (e: KeyboardEvent): NavDir | 'commit-stay' | null => {
  if (e.key === 'Enter') return e.shiftKey ? 'up' : 'down'
  if (e.key === 'Tab') return e.shiftKey ? 'left' : 'right'
  return null
}

/**
 * IME-safe check. Native event's isComposing is the ground truth — keyCode 229
 * is the legacy fallback. React's SyntheticEvent does not expose isComposing
 * directly on KeyboardEvent on all versions, so we reach into nativeEvent.
 */
const isComposingEvent = (e: KeyboardEvent): boolean => {
  const ne = e.nativeEvent as KeyboardEventInit & { isComposing?: boolean; keyCode?: number }
  return ne.isComposing === true || ne.keyCode === 229
}

export function useEditable<TId>(opts: UseEditableOptions<TId>) {
  const { getValue, onCommit, onNavigate, initialFocus = null, commitKeyMap = defaultCommitKeyMap } = opts

  const [focusId, setFocusId] = useState<TId | null>(initialFocus)
  const [editing, setEditing] = useState<TId | null>(null)
  const [draft, setDraft] = useState('')
  const composingRef = useRef(false)
  const elRef = useRef<EditableEl | null>(null)
  const caretModeRef = useRef<CaretMode>('end')

  const startEdit = useCallback(
    (id: TId, prefill?: string, opts?: { caret?: CaretMode }) => {
      setEditing(id)
      setDraft(prefill !== undefined ? prefill : getValue(id))
      // Type-to-edit (prefill given) → caret-end so the next keystroke continues the word.
      // F2/double-click (no prefill) → caret-end by Google Sheets convention.
      caretModeRef.current = opts?.caret ?? 'end'
    },
    [getValue],
  )

  const cancelEdit = useCallback(() => {
    setEditing(null)
    composingRef.current = false
  }, [])

  const commitEdit = useCallback(
    (navigate?: NavDir) => {
      if (editing === null) return
      onCommit(editing, draft)
      const next = navigate && onNavigate ? onNavigate(editing, navigate) : null
      setEditing(null)
      composingRef.current = false
      if (next !== null && next !== undefined) setFocusId(next)
    },
    [editing, draft, onCommit, onNavigate],
  )

  /**
   * Call from outer keydown (e.g. on the grid container) to start edit on printable input.
   * Returns true if the event was consumed.
   */
  const handleTypeToEdit = useCallback(
    (e: KeyboardEvent, id: TId): boolean => {
      if (editing !== null) return false
      if (e.ctrlKey || e.metaKey || e.altKey) return false
      if (isComposingEvent(e)) return false
      // Single printable character only; ignore named keys like ArrowDown/Enter/Escape.
      if (e.key.length !== 1) return false
      e.preventDefault()
      startEdit(id, e.key)
      return true
    },
    [editing, startEdit],
  )

  // Auto-focus + caret placement when entering edit mode. Runs after the input mounts
  // because the ref is set before this effect fires (RefCallback runs in commit phase).
  useEffect(() => {
    if (editing === null) return
    const el = elRef.current
    if (!el) return
    el.focus()
    const len = el.value.length
    const mode = caretModeRef.current
    if (mode === 'end') el.setSelectionRange(len, len)
    else if (mode === 'start') el.setSelectionRange(0, 0)
    else if (mode === 'select-all') el.setSelectionRange(0, len)
    // 'preserve' → leave whatever the browser set
  }, [editing])

  const setEl: RefCallback<EditableEl> = (el) => {
    elRef.current = el
  }

  const inputProps: InputProps = {
    ref: setEl,
    value: draft,
    onChange: (e) => setDraft(e.target.value),
    onKeyDown: (e) => {
      // IME composition is in flight — never commit/cancel; let IME consume.
      if (isComposingEvent(e)) return
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelEdit()
        return
      }
      const dir = commitKeyMap(e)
      if (dir !== null) {
        e.preventDefault()
        commitEdit(dir === 'commit-stay' ? undefined : dir)
      }
    },
    onCompositionStart: () => {
      composingRef.current = true
    },
    onCompositionEnd: () => {
      composingRef.current = false
    },
    onBlur: () => {
      // blur commits without navigation; IME finalizes via compositionend before blur fires.
      if (editing !== null) commitEdit()
    },
  }

  return {
    focusId,
    setFocusId,
    editing,
    draft,
    setDraft,
    startEdit,
    commitEdit,
    cancelEdit,
    handleTypeToEdit,
    inputProps,
    isComposing: composingRef.current,
    /** Direct access to the focused editable element. Most consumers won't need this. */
    inputElement: elRef,
  }
}
