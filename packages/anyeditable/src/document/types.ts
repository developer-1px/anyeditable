import type { HTMLAttributes, ReactNode } from 'react'
import type { JSONPatchOperation } from 'zod-crud'

export type EditableDocumentBlockKind = 'paragraph' | 'heading' | 'listItem' | 'callout' | 'code'

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
  getHeadingLevel?: (block: TBlock, index: number) => 1 | 2 | 3 | 4 | 5 | 6
  createParagraph: (text: string) => TBlock
  createHeading?: (text: string, level: 1 | 2 | 3 | 4 | 5 | 6) => TBlock
  createCode?: (text: string) => TBlock
  textPath?: (index: number) => string
}

export interface EditableDocumentOps {
  apply(patches: readonly JSONPatchOperation[]): void
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

