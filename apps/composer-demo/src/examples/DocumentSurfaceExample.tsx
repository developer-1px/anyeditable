import { useCallback, useMemo, useRef, useState } from 'react'
import { CodeBlock } from '../docs/CodeBlock.js'
import { useEditableDocumentSurface, type EditableDocumentBlockAdapter } from '@interactive-os/anyeditable'
import type { JSONPatchOperation } from 'zod-crud'

interface DemoBlock {
  id: string
  kind: 'paragraph' | 'heading' | 'code'
  text: string
  level?: 1 | 2
}

const INITIAL_BLOCKS: DemoBlock[] = [
  { id: 'p1', kind: 'paragraph', text: '' },
  { id: 'h1', kind: 'heading', level: 2, text: '' },
  { id: 'p2', kind: 'paragraph', text: 'hello world' },
  { id: 'c1', kind: 'code', text: 'const ok = true' },
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
  const [trace, setTrace] = useState<string[]>([])
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks
  const rootRef = useRef<HTMLElement | null>(null)
  const pushTrace = useCallback((label: string, detail: Record<string, unknown>) => {
    const line = `${new Date().toISOString()} ${label} ${JSON.stringify(detail)}`
    console.info('[document-surface:trace]', line)
    setTrace(current => [line, ...current].slice(0, 80))
  }, [])
  const adapter = useMemo<EditableDocumentBlockAdapter<DemoBlock>>(() => ({
    getKey: block => block.id,
    getKind: block => block.kind,
    getText: block => block.text,
    getHeadingLevel: block => block.level ?? 2,
    createParagraph: text => ({ id: crypto.randomUUID(), kind: 'paragraph', text }),
    createHeading: (text, level) => ({ id: crypto.randomUUID(), kind: 'heading', level: level === 1 ? 1 : 2, text }),
    createCode: text => ({ id: crypto.randomUUID(), kind: 'code', text }),
  }), [])
  const surface = useEditableDocumentSurface({
    blocks,
    adapter,
    ops: {
      apply: patches => {
        pushTrace('ops.apply', { patches, stateBefore: blocksRef.current.map(block => block.text), dom: snapshotDOM(rootRef.current) })
        setBlocks(current => {
          const next = applyPatches(current, patches)
          pushTrace('ops.applied', { stateAfter: next.map(block => block.text) })
          return next
        })
      },
    },
    label: 'Document editor',
    placeholder: 'Write a block document',
    spellCheck: true,
  })
  const setContainerRef = useCallback((el: HTMLElement | null) => {
    rootRef.current = el
    surface.containerRef(el)
  }, [surface])
  const traceEvent = useCallback((label: string, event: React.SyntheticEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
    const native = event.nativeEvent as InputEvent | CompositionEvent | KeyboardEvent
    pushTrace(label, {
      type: native.type,
      inputType: 'inputType' in native ? native.inputType : undefined,
      data: 'data' in native ? native.data : undefined,
      key: 'key' in native ? native.key : undefined,
      isComposing: 'isComposing' in native ? native.isComposing : undefined,
      defaultPrevented: native.defaultPrevented,
      selection: snapshotSelection(rootRef.current),
      dom: snapshotDOM(rootRef.current),
      state: blocksRef.current.map(block => block.text),
    })
  }, [pushTrace])

  return (
    <div className="example document-example">
      <div className="playground">
        <h3>실행: block document surface</h3>
        <div
          className="document-surface"
          data-testid="document-surface"
          {...surface.containerProps}
          ref={setContainerRef}
          onBeforeInput={(event) => traceEvent('react.beforeinput', event)}
          onCompositionStart={(event) => traceEvent('react.compositionstart', event)}
          onCompositionUpdate={(event) => traceEvent('react.compositionupdate', event)}
          onCompositionEnd={(event) => traceEvent('react.compositionend', event)}
          onInput={(event) => traceEvent('react.input', event)}
          onKeyDown={(event) => {
            traceEvent('react.keydown', event)
            surface.containerProps.onKeyDown?.(event)
          }}
        />
        <p className="hint">첫 문단에 입력, heading에 입력, Enter / Backspace 로 블록을 합치고 나누세요.</p>
      </div>
      <div className="observe">
        <h3>관찰</h3>
        <pre data-testid="document-state">{JSON.stringify({ blocks }, null, 2)}</pre>
        <h3>IME trace</h3>
        <pre data-testid="document-ime-trace">{trace.join('\n')}</pre>
      </div>
      <CodeBlock code={DOCUMENT_SURFACE_SNIPPET} />
    </div>
  )
}

function applyPatches(blocks: DemoBlock[], patches: readonly JSONPatchOperation[]): DemoBlock[] {
  const next = structuredClone(blocks) as DemoBlock[]
  for (const patch of patches) {
    const parts = patch.path.split('/').slice(1)
    const index = Number(parts[1])
    if (patch.op === 'add') next.splice(index, 0, patch.value as DemoBlock)
    else if (patch.op === 'remove') next.splice(index, 1)
    else if (patch.op === 'replace' && parts[2] === 'text') next[index]!.text = patch.value as string
    else if (patch.op === 'replace' && parts.length === 2) next[index] = patch.value as DemoBlock
  }
  return next
}

function snapshotDOM(root: HTMLElement | null): Array<{ index: string; text: string; html: string }> {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>('[data-doc-block-index]')).map(block => ({
    index: block.dataset.docBlockIndex ?? '',
    text: block.textContent ?? '',
    html: block.innerHTML,
  }))
}

function snapshotSelection(root: HTMLElement | null): unknown {
  if (!root) return null
  const selection = root.ownerDocument.getSelection()
  if (!selection) return null
  const describe = (node: Node | null) => {
    if (!node) return null
    if (node.nodeType === Node.TEXT_NODE) return { kind: 'text', value: node.nodeValue }
    if (node instanceof HTMLElement) return {
      kind: 'element',
      tag: node.tagName.toLowerCase(),
      blockIndex: node.dataset.docBlockIndex,
      text: node.textContent,
    }
    return { kind: `node-${node.nodeType}` }
  }
  return {
    anchorOffset: selection.anchorOffset,
    focusOffset: selection.focusOffset,
    isCollapsed: selection.isCollapsed,
    anchor: describe(selection.anchorNode),
    focus: describe(selection.focusNode),
  }
}
