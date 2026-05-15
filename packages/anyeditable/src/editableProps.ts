import type { KeyboardEvent, RefCallback } from 'react'
import { isImeSafe, matches } from '@interactive-os/keyboard'
import type { InputProps, SelectProps, NavDir } from './editableTypes.js'
import { toKeyInput } from './keyboardInput.js'

type EditableEl = HTMLInputElement | HTMLTextAreaElement
type SelectEl = HTMLSelectElement

/**
 * IME-safe check. Native event's isComposing is the ground truth — keyCode 229
 * is the legacy fallback for older Safari.
 */
export const isComposingEvent = (e: KeyboardEvent): boolean => {
  return !isImeSafe(toKeyInput(e))
}

export const defaultCommitKeyMap = (e: KeyboardEvent): NavDir | 'commit-stay' | null => {
  const key = toKeyInput(e)
  if (matches(key, 'Alt+Enter')) return null
  if (matches(key, 'Control+Enter Meta+Enter')) return 'commit-stay'
  if (matches(key, 'Shift+Enter')) return 'up'
  if (matches(key, 'Enter')) return 'down'
  if (matches(key, 'Shift+Tab')) return 'left'
  if (matches(key, 'Tab')) return 'right'
  return null
}

export interface InputPropsArgs {
  setEl: RefCallback<EditableEl>
  draft: string
  editing: unknown
  setDraft: (v: string) => void
  composingRef: { current: boolean }
  commitKeyMap: (e: KeyboardEvent) => NavDir | 'commit-stay' | null
  cancelEdit: () => void
  commitEdit: (nav?: NavDir) => void
}

export function buildInputProps(a: InputPropsArgs): InputProps {
  return {
    ref: a.setEl,
    value: a.draft,
    onChange: (e) => a.setDraft(e.target.value),
    onKeyDown: (e) => {
      if (isComposingEvent(e)) return
      if (e.key === 'Escape') { e.preventDefault(); a.cancelEdit(); return }
      const dir = a.commitKeyMap(e)
      if (dir !== null) {
        e.preventDefault()
        a.commitEdit(dir === 'commit-stay' ? undefined : dir)
      }
    },
    onCompositionStart: () => { a.composingRef.current = true },
    onCompositionEnd: () => { a.composingRef.current = false },
    onBlur: () => { if (a.editing !== null) a.commitEdit() },
  }
}

export interface SelectPropsArgs<TId> {
  setEl: RefCallback<SelectEl>
  draft: string
  editing: TId | null
  setDraft: (v: string) => void
  setEditing: (id: TId | null) => void
  setFocusId: (id: TId | null) => void
  onCommit: (id: TId, next: string) => void
  onNavigate: ((id: TId, dir: NavDir) => TId | null) | undefined
  cancelEdit: () => void
  commitEdit: () => void
}

export function buildSelectProps<TId>(a: SelectPropsArgs<TId>): SelectProps {
  return {
    ref: a.setEl,
    value: a.draft,
    onChange: (e) => {
      const next = e.target.value
      a.setDraft(next)
      if (a.editing === null) return
      a.onCommit(a.editing, next)
      const navTarget = a.onNavigate ? a.onNavigate(a.editing, 'down') : null
      a.setEditing(null)
      if (navTarget !== null && navTarget !== undefined) a.setFocusId(navTarget)
    },
    onKeyDown: (e) => {
      if (e.key === 'Escape') { e.preventDefault(); a.cancelEdit() }
    },
    onBlur: () => { if (a.editing !== null) a.commitEdit() },
  }
}
