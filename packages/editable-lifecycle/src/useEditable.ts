import { useCallback, useRef, useState } from 'react'
import type { KeyboardEvent, ChangeEvent, CompositionEvent, FocusEvent } from 'react'

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

export interface InputProps {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onCompositionStart: (e: CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onCompositionEnd: (e: CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

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

  const startEdit = useCallback(
    (id: TId, prefill?: string) => {
      setEditing(id)
      setDraft(prefill !== undefined ? prefill : getValue(id))
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

  const inputProps: InputProps = {
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
  }
}
