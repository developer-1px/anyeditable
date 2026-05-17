import type { JSONPatchOperation } from 'zod-crud'
import type {
  DocumentRange,
  DocumentPosition,
  EditableDocumentBlockAdapter,
} from './types.js'

export function insertTextOps<TBlock>(
  blocks: readonly TBlock[],
  adapter: EditableDocumentBlockAdapter<TBlock>,
  position: DocumentPosition,
  text: string,
): { patches: JSONPatchOperation[]; caret: DocumentPosition } {
  const current = adapter.getText(blocks[position.blockIndex]!, position.blockIndex)
  const next = current.slice(0, position.offset) + text + current.slice(position.offset)
  return {
    patches: [{ op: 'replace', path: textPath(adapter, position.blockIndex), value: next }],
    caret: { blockIndex: position.blockIndex, offset: position.offset + text.length },
  }
}

export function replaceRangeTextOps<TBlock>(
  blocks: readonly TBlock[],
  adapter: EditableDocumentBlockAdapter<TBlock>,
  range: DocumentRange,
  text: string,
): { patches: JSONPatchOperation[]; caret: DocumentPosition } {
  const start = before(range.anchor, range.focus) ? range.anchor : range.focus
  const end = before(range.anchor, range.focus) ? range.focus : range.anchor
  if (start.blockIndex !== end.blockIndex) return insertTextOps(blocks, adapter, start, text)
  const current = adapter.getText(blocks[start.blockIndex]!, start.blockIndex)
  const next = current.slice(0, start.offset) + text + current.slice(end.offset)
  return {
    patches: [{ op: 'replace', path: textPath(adapter, start.blockIndex), value: next }],
    caret: { blockIndex: start.blockIndex, offset: start.offset + text.length },
  }
}

export function replaceRangeTextFromSnapshotOps<TBlock>(
  adapter: EditableDocumentBlockAdapter<TBlock>,
  range: DocumentRange,
  baseText: string,
  text: string,
): { patches: JSONPatchOperation[]; caret: DocumentPosition } {
  const start = before(range.anchor, range.focus) ? range.anchor : range.focus
  const end = before(range.anchor, range.focus) ? range.focus : range.anchor
  const next = baseText.slice(0, start.offset) + text + baseText.slice(start.blockIndex === end.blockIndex ? end.offset : start.offset)
  return {
    patches: [{ op: 'replace', path: textPath(adapter, start.blockIndex), value: next }],
    caret: { blockIndex: start.blockIndex, offset: start.offset + text.length },
  }
}

export function splitBlockOps<TBlock>(
  blocks: readonly TBlock[],
  adapter: EditableDocumentBlockAdapter<TBlock>,
  position: DocumentPosition,
): { patches: JSONPatchOperation[]; caret: DocumentPosition } {
  const block = blocks[position.blockIndex]!
  const text = adapter.getText(block, position.blockIndex)
  const before = text.slice(0, position.offset)
  const after = text.slice(position.offset)
  return {
    patches: [
      { op: 'replace', path: textPath(adapter, position.blockIndex), value: before },
      { op: 'add', path: `/blocks/${position.blockIndex + 1}`, value: adapter.createParagraph(after) },
    ],
    caret: { blockIndex: position.blockIndex + 1, offset: 0 },
  }
}

export function deleteBackwardOps<TBlock>(
  blocks: readonly TBlock[],
  adapter: EditableDocumentBlockAdapter<TBlock>,
  position: DocumentPosition,
): { patches: JSONPatchOperation[]; caret: DocumentPosition } {
  const block = blocks[position.blockIndex]
  if (!block) return { patches: [], caret: position }
  const text = adapter.getText(block, position.blockIndex)
  if (position.offset > 0) {
    return {
      patches: [{ op: 'replace', path: textPath(adapter, position.blockIndex), value: text.slice(0, position.offset - 1) + text.slice(position.offset) }],
      caret: { blockIndex: position.blockIndex, offset: position.offset - 1 },
    }
  }
  const prev = blocks[position.blockIndex - 1]
  if (!prev) return { patches: [], caret: position }
  const prevText = adapter.getText(prev, position.blockIndex - 1)
  return {
    patches: [
      { op: 'replace', path: textPath(adapter, position.blockIndex - 1), value: prevText + text },
      { op: 'remove', path: `/blocks/${position.blockIndex}` },
    ],
    caret: { blockIndex: position.blockIndex - 1, offset: prevText.length },
  }
}

export function deleteForwardOps<TBlock>(
  blocks: readonly TBlock[],
  adapter: EditableDocumentBlockAdapter<TBlock>,
  position: DocumentPosition,
): { patches: JSONPatchOperation[]; caret: DocumentPosition } {
  const block = blocks[position.blockIndex]
  if (!block) return { patches: [], caret: position }
  const text = adapter.getText(block, position.blockIndex)
  if (position.offset < text.length) {
    return {
      patches: [{ op: 'replace', path: textPath(adapter, position.blockIndex), value: text.slice(0, position.offset) + text.slice(position.offset + 1) }],
      caret: position,
    }
  }
  const next = blocks[position.blockIndex + 1]
  if (!next) return { patches: [], caret: position }
  return {
    patches: [
      { op: 'replace', path: textPath(adapter, position.blockIndex), value: text + adapter.getText(next, position.blockIndex + 1) },
      { op: 'remove', path: `/blocks/${position.blockIndex + 1}` },
    ],
    caret: position,
  }
}

export function pasteTextOps<TBlock>(
  blocks: readonly TBlock[],
  adapter: EditableDocumentBlockAdapter<TBlock>,
  position: DocumentPosition,
  text: string,
): { patches: JSONPatchOperation[]; caret: DocumentPosition } {
  const normalized = text.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  if (lines.length <= 1) return insertTextOps(blocks, adapter, position, normalized)
  const block = blocks[position.blockIndex]!
  const current = adapter.getText(block, position.blockIndex)
  const head = current.slice(0, position.offset) + lines[0]!
  const tail = lines.at(-1)! + current.slice(position.offset)
  const middle = lines.slice(1, -1)
  const patches: JSONPatchOperation[] = [{ op: 'replace', path: textPath(adapter, position.blockIndex), value: head }]
  middle.forEach((line, index) => {
    patches.push({ op: 'add', path: `/blocks/${position.blockIndex + index + 1}`, value: blockFromMarkdown(adapter, line) })
  })
  patches.push({ op: 'add', path: `/blocks/${position.blockIndex + middle.length + 1}`, value: blockFromMarkdown(adapter, tail) })
  return {
    patches,
    caret: { blockIndex: position.blockIndex + lines.length - 1, offset: lines.at(-1)!.length },
  }
}

function blockFromMarkdown<TBlock>(adapter: EditableDocumentBlockAdapter<TBlock>, line: string): TBlock {
  const heading = line.match(/^(#{1,6})\s+(.*)$/)
  if (heading && adapter.createHeading) return adapter.createHeading(heading[2]!, heading[1]!.length as 1 | 2 | 3 | 4 | 5 | 6)
  if (/^```/.test(line) && adapter.createCode) return adapter.createCode('')
  return adapter.createParagraph(line)
}

function textPath<TBlock>(adapter: EditableDocumentBlockAdapter<TBlock>, index: number): string {
  return adapter.textPath?.(index) ?? `/blocks/${index}/text`
}

function before(a: DocumentPosition, b: DocumentPosition): boolean {
  return a.blockIndex < b.blockIndex || (a.blockIndex === b.blockIndex && a.offset <= b.offset)
}
