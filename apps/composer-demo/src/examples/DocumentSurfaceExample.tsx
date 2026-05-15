import { useMemo, useState } from 'react'
import { CodeBlock } from '../docs/CodeBlock.js'
import { useEditableDocumentSurface, type EditableDocumentBlockAdapter, type EditableDocumentMark } from '@interactive-os/anyeditable'
import type { JsonPatchOperation } from 'zod-crud'

interface DemoBlock {
  id: string
  kind: 'paragraph' | 'heading' | 'code'
  text: string
  level?: 1 | 2
  marks?: EditableDocumentMark[]
}

const INITIAL_BLOCKS: DemoBlock[] = [
  { id: 'p1', kind: 'paragraph', text: '', marks: [] },
  { id: 'h1', kind: 'heading', level: 2, text: '', marks: [] },
  { id: 'p2', kind: 'paragraph', text: 'bold target', marks: [] },
  { id: 'c1', kind: 'code', text: 'const ok = true', marks: [] },
]

const DOCUMENT_SURFACE_SNIPPET = `const surface = useEditableDocumentSurface({
  blocks,
  adapter,
  ops: { apply: patches => setBlocks(applyPatches(blocks, patches)) },
  label: 'Document editor',
})

return <div ref={surface.containerRef} {...surface.containerProps} />`

export function DocumentSurfaceExample() {
  const [blocks, setBlocks] = useState<DemoBlock[]>(INITIAL_BLOCKS)
  const adapter = useMemo<EditableDocumentBlockAdapter<DemoBlock>>(() => ({
    getKey: block => block.id,
    getKind: block => block.kind,
    getText: block => block.text,
    getMarks: block => block.marks ?? [],
    getHeadingLevel: block => block.level ?? 2,
    createParagraph: text => ({ id: crypto.randomUUID(), kind: 'paragraph', text, marks: [] }),
    createHeading: (text, level) => ({ id: crypto.randomUUID(), kind: 'heading', level: level === 1 ? 1 : 2, text, marks: [] }),
    createCode: text => ({ id: crypto.randomUUID(), kind: 'code', text, marks: [] }),
  }), [])
  const surface = useEditableDocumentSurface({
    blocks,
    adapter,
    ops: { apply: patches => setBlocks(current => applyPatches(current, patches)) },
    label: 'Document editor',
    placeholder: 'Write a block document',
    spellCheck: true,
  })

  return (
    <div className="example document-example">
      <div className="playground">
        <h3>실행: block document surface</h3>
        <div className="document-surface" data-testid="document-surface" ref={surface.containerRef} {...surface.containerProps} />
        <p className="hint">첫 문단에 입력, heading에 입력, 텍스트 선택 후 Cmd/Ctrl+B, Enter, Backspace를 시도하세요.</p>
      </div>
      <div className="observe">
        <h3>관찰</h3>
        <pre data-testid="document-state">{JSON.stringify({ blocks }, null, 2)}</pre>
      </div>
      <CodeBlock code={DOCUMENT_SURFACE_SNIPPET} />
    </div>
  )
}

function applyPatches(blocks: DemoBlock[], patches: readonly JsonPatchOperation[]): DemoBlock[] {
  const next = structuredClone(blocks) as DemoBlock[]
  for (const patch of patches) {
    const parts = patch.path.split('/').slice(1)
    const index = Number(parts[1])
    if (patch.op === 'add') next.splice(index, 0, patch.value as DemoBlock)
    else if (patch.op === 'remove') next.splice(index, 1)
    else if (patch.op === 'replace' && parts[2] === 'text') next[index]!.text = patch.value as string
    else if (patch.op === 'replace' && parts[2] === 'marks') next[index]!.marks = patch.value as EditableDocumentMark[]
    else if (patch.op === 'replace' && parts.length === 2) next[index] = patch.value as DemoBlock
  }
  return next
}

