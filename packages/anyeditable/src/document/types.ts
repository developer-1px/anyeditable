import type { HTMLAttributes, ReactNode } from 'react'
import type { JsonPatchOperation } from 'zod-crud'

export type EditableDocumentBlockKind = 'paragraph' | 'heading' | 'listItem' | 'callout' | 'code'

export type EditableDocumentMarkKind =
  | 'bold'
  | 'italic'
  | 'code'
  | 'strikethrough'
  | 'highlight'
  | 'link'
  | 'wikiLink'
  | 'tag'
  | 'embed'

export interface EditableDocumentMark {
  kind: EditableDocumentMarkKind
  from: number
  to: number
  href?: string
  value?: string
}

export interface DocumentPosition {
  blockIndex: number
  offset: number
}

export interface DocumentRange {
  anchor: DocumentPosition
  focus: DocumentPosition
}

export interface EditableDocumentBlockAdapter<TBlock> {
  getKey?: (block: TBlock, index: number) => string
  getKind: (block: TBlock, index: number) => EditableDocumentBlockKind
  getText: (block: TBlock, index: number) => string
  getMarks?: (block: TBlock, index: number) => readonly EditableDocumentMark[]
  getHeadingLevel?: (block: TBlock, index: number) => 1 | 2 | 3 | 4 | 5 | 6
  createParagraph: (text: string) => TBlock
  createHeading?: (text: string, level: 1 | 2 | 3 | 4 | 5 | 6) => TBlock
  createCode?: (text: string) => TBlock
  textPath?: (index: number) => string
  marksPath?: (index: number) => string
}

export interface EditableDocumentOps {
  apply(patches: readonly JsonPatchOperation[]): void
}

export interface UseEditableDocumentSurfaceOptions<TBlock> {
  blocks: readonly TBlock[]
  adapter: EditableDocumentBlockAdapter<TBlock>
  ops: EditableDocumentOps
  readOnly?: boolean
  placeholder?: string
  label?: string
  labelledBy?: string
  spellCheck?: boolean
}

export interface UseEditableDocumentSurfaceReturn {
  containerRef: (el: HTMLElement | null) => void
  containerProps: HTMLAttributes<HTMLElement>
  portals: ReactNode[]
  getSelection: () => DocumentRange | null
  setSelection: (position: DocumentPosition) => void
}

