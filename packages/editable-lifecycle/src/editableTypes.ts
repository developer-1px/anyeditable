import type { KeyboardEvent, ChangeEvent, CompositionEvent, FocusEvent, RefCallback } from 'react'

export type NavDir = 'down' | 'up' | 'left' | 'right'
export type CaretMode = 'end' | 'start' | 'select-all' | 'preserve'

type EditableEl = HTMLInputElement | HTMLTextAreaElement
type SelectEl = HTMLSelectElement

export interface InputProps {
  ref: RefCallback<EditableEl>
  value: string
  onChange: (e: ChangeEvent<EditableEl>) => void
  onKeyDown: (e: KeyboardEvent<EditableEl>) => void
  onCompositionStart: (e: CompositionEvent<EditableEl>) => void
  onCompositionEnd: (e: CompositionEvent<EditableEl>) => void
  onBlur: (e: FocusEvent<EditableEl>) => void
}

export interface SelectProps {
  ref: RefCallback<SelectEl>
  value: string
  onChange: (e: ChangeEvent<SelectEl>) => void
  onKeyDown: (e: KeyboardEvent<SelectEl>) => void
  onBlur: (e: FocusEvent<SelectEl>) => void
}

export interface UseEditableOptions<TId> {
  getValue: (id: TId) => string
  onCommit: (id: TId, next: string) => void
  onNavigate?: (id: TId, dir: NavDir) => TId | null
  initialFocus?: TId | null
  commitKeyMap?: (e: KeyboardEvent) => NavDir | 'commit-stay' | null
  readOnly?: (id: TId) => boolean
}
