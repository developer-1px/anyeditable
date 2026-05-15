import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, RefCallback } from 'react'
import { isImeSafe, isPrintable } from '@interactive-os/keyboard'
import type { CaretMode, NavDir, UseEditableOptions } from './editableTypes.js'
import { buildInputProps, buildSelectProps, defaultCommitKeyMap } from './editableProps.js'
import { toKeyInput } from './keyboardInput.js'

type EditableEl = HTMLInputElement | HTMLTextAreaElement
type SelectEl = HTMLSelectElement

export function useEditable<TId>(opts: UseEditableOptions<TId>) {
  const { getValue, onCommit, onNavigate, initialFocus = null, commitKeyMap = defaultCommitKeyMap, readOnly } = opts

  const [focusId, setFocusId] = useState<TId | null>(initialFocus)
  const [editing, setEditing] = useState<TId | null>(null)
  const [draft, setDraft] = useState('')
  const composingRef = useRef(false)
  const elRef = useRef<EditableEl | null>(null)
  const selectElRef = useRef<SelectEl | null>(null)
  const caretModeRef = useRef<CaretMode>('end')

  const startEdit = useCallback(
    (id: TId, prefill?: string, o?: { caret?: CaretMode }) => {
      if (readOnly?.(id)) return
      setEditing(id)
      setDraft(prefill !== undefined ? prefill : getValue(id))
      caretModeRef.current = o?.caret ?? 'end'
    },
    [getValue, readOnly],
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

  const handleTypeToEdit = useCallback(
    (e: KeyboardEvent, id: TId): boolean => {
      if (editing !== null) return false
      const key = toKeyInput(e)
      if (!isImeSafe(key) || !isPrintable(key)) return false
      e.preventDefault()
      startEdit(id, e.key)
      return true
    },
    [editing, startEdit],
  )

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
  }, [editing])

  const setEl: RefCallback<EditableEl> = (el) => { elRef.current = el }
  const setSelectEl: RefCallback<SelectEl> = (el) => { selectElRef.current = el }

  const inputProps = buildInputProps({ setEl, draft, editing, setDraft, composingRef, commitKeyMap, cancelEdit, commitEdit })
  const selectProps = buildSelectProps<TId>({ setEl: setSelectEl, draft, editing, setDraft, setEditing, setFocusId, onCommit, onNavigate, cancelEdit, commitEdit: () => commitEdit() })

  return {
    focusId, setFocusId, editing, draft, setDraft,
    startEdit, commitEdit, cancelEdit, handleTypeToEdit,
    inputProps, selectProps,
    isComposing: composingRef.current,
    inputElement: elRef,
  }
}
