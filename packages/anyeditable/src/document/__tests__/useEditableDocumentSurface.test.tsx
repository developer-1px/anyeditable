import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { useEditableDocumentSurface, type EditableDocumentBlockAdapter, type EditableDocumentMark } from '../useEditableDocumentSurface.js'

interface TestBlock {
  id: string
  kind: 'paragraph' | 'heading'
  text: string
  marks?: EditableDocumentMark[]
  level?: 1 | 2
}

const adapter: EditableDocumentBlockAdapter<TestBlock> = {
  getKey: block => block.id,
  getKind: block => block.kind,
  getText: block => block.text,
  getMarks: block => block.marks ?? [],
  getHeadingLevel: block => block.level ?? 2,
  createParagraph: text => ({ id: 'new', kind: 'paragraph', text, marks: [] }),
  createHeading: (text, level) => ({ id: 'new', kind: 'heading', text, level: level === 1 ? 1 : 2, marks: [] }),
}

afterEach(cleanup)

describe('useEditableDocumentSurface', () => {
  it('renders block DOM and inserts text via beforeinput patches', () => {
    const r = render(<Harness initial={[p('a', '')]} />)
    const editor = r.getByTestId('editor')
    placeCaret(editor, 0, 0)
    beforeInput(editor, 'insertText', 'A')
    expect(r.getByTestId('state').textContent).toContain('"text":"A"')
    expect(editor.textContent).toBe('A')
  })

  it('renders headings and inline marks as decorated DOM', () => {
    const r = render(<Harness initial={[{ id: 'h', kind: 'heading', level: 1, text: 'Title', marks: [{ kind: 'bold', from: 0, to: 5 }] }]} />)
    expect(r.container.querySelector('h1')?.textContent).toBe('Title')
    expect(r.container.querySelector('[data-doc-mark-kind="bold"]')?.textContent).toBe('Title')
  })

  it('Enter splits a block', () => {
    const r = render(<Harness initial={[p('a', 'hello')]} />)
    const editor = r.getByTestId('editor')
    placeCaret(editor, 0, 2)
    beforeInput(editor, 'insertParagraph')
    expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks.map((b: TestBlock) => b.text)).toEqual(['he', 'llo'])
    expect(editor.querySelectorAll('[data-doc-block-index]').length).toBe(2)
  })

  it('Backspace at block start merges with previous block', () => {
    const r = render(<Harness initial={[p('a', 'hello'), p('b', 'world')]} />)
    const editor = r.getByTestId('editor')
    placeCaret(editor, 1, 0)
    beforeInput(editor, 'deleteContentBackward')
    expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks.map((b: TestBlock) => b.text)).toEqual(['helloworld'])
  })

  it('Mod+B toggles bold mark on a same-block selection', () => {
    const r = render(<Harness initial={[p('a', 'hello')]} />)
    const editor = r.getByTestId('editor')
    selectText(editor, 0, 0, 5)
    fireEvent.keyDown(editor, { key: 'b', metaKey: true })
    expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks[0].marks).toEqual([{ kind: 'bold', from: 0, to: 5 }])
  })

  it('compositionend inserts Korean text through operations', () => {
    const r = render(<Harness initial={[p('a', '')]} />)
    const editor = r.getByTestId('editor')
    placeCaret(editor, 0, 0)
    fireEvent.compositionStart(editor)
    beforeInput(editor, 'insertCompositionText', 'ㅎ')
    expect(editor.textContent).toBe('')
    fireEvent.compositionEnd(editor, { data: '한' })
    expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks[0].text).toBe('한')
    expect(editor.textContent).toBe('한')
  })
})

function Harness({ initial }: { initial: TestBlock[] }) {
  const [blocks, setBlocks] = useState(initial)
  const surface = useEditableDocumentSurface({
    blocks,
    adapter,
    ops: { apply: patches => setBlocks(current => applyPatches(current, patches)) },
    label: 'Document',
  })
  return (
    <div>
      <div data-testid="editor" ref={surface.containerRef} {...surface.containerProps} />
      <pre data-testid="state">{JSON.stringify({ blocks })}</pre>
    </div>
  )
}

function p(id: string, text: string): TestBlock {
  return { id, kind: 'paragraph', text, marks: [] }
}

function beforeInput(el: Element, inputType: string, data?: string) {
  const event = new Event('beforeinput', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'inputType', { value: inputType })
  Object.defineProperty(event, 'data', { value: data ?? null })
  fireEvent(el, event)
}

function placeCaret(root: Element, blockIndex: number, offset: number) {
  const block = root.querySelector(`[data-doc-block-index="${blockIndex}"]`)!
  const text = block.firstChild?.nodeType === 3 ? block.firstChild! : block.firstChild?.firstChild ?? block
  const range = document.createRange()
  range.setStart(text, Math.min(offset, text.textContent?.length ?? 0))
  range.collapse(true)
  const selection = document.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
}

function selectText(root: Element, blockIndex: number, from: number, to: number) {
  const block = root.querySelector(`[data-doc-block-index="${blockIndex}"]`)!
  const text = block.firstChild?.nodeType === 3 ? block.firstChild! : block.firstChild?.firstChild ?? block
  const range = document.createRange()
  range.setStart(text, from)
  range.setEnd(text, to)
  const selection = document.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
}

function applyPatches(blocks: TestBlock[], patches: readonly { op: string; path: string; value?: unknown }[]): TestBlock[] {
  const next = structuredClone(blocks) as TestBlock[]
  for (const patch of patches) {
    const parts = patch.path.split('/').slice(1)
    const index = Number(parts[1])
    if (patch.op === 'add') next.splice(index, 0, patch.value as TestBlock)
    else if (patch.op === 'remove') next.splice(index, 1)
    else if (patch.op === 'replace' && parts[2] === 'text') next[index]!.text = patch.value as string
    else if (patch.op === 'replace' && parts[2] === 'marks') next[index]!.marks = patch.value as EditableDocumentMark[]
  }
  return next.map((block, index) => ({ ...block, id: block.id === 'new' ? `new-${index}` : block.id }))
}

