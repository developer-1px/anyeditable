import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { useEditableDocumentSurface, type EditableDocumentBlockAdapter } from '../useEditableDocumentSurface.js'

interface TestBlock {
  id: string
  kind: 'paragraph' | 'heading'
  text: string
  level?: 1 | 2
}

const adapter: EditableDocumentBlockAdapter<TestBlock> = {
  getKey: block => block.id,
  getKind: block => block.kind,
  getText: block => block.text,
  getHeadingLevel: block => block.level ?? 2,
  createParagraph: text => ({ id: 'new', kind: 'paragraph', text }),
  createHeading: (text, level) => ({ id: 'new', kind: 'heading', text, level: level === 1 ? 1 : 2 }),
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

  it('renders heading blocks with semantic tag', () => {
    const r = render(<Harness initial={[{ id: 'h', kind: 'heading', level: 1, text: 'Title' }]} />)
    expect(r.container.querySelector('h1')?.textContent).toBe('Title')
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

  it('compositionend inserts Korean text through operations', async () => {
    const r = render(<Harness initial={[p('a', '')]} />)
    const editor = r.getByTestId('editor')
    placeCaret(editor, 0, 0)
    fireEvent.compositionStart(editor)
    const composingInput = beforeInput(editor, 'insertCompositionText', 'ㅎ')
    expect(composingInput.defaultPrevented).toBe(false)
    expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks[0].text).toBe('')
    editor.querySelector('[data-doc-block-index="0"]')!.textContent = '한'
    fireEvent.compositionEnd(editor, { data: '한' })
    await waitFor(() => expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks[0].text).toBe('한'))
    expect(editor.textContent).toBe('한')
  })

  it('does not duplicate the final IME insertText event after compositionend', () => {
    const r = render(<Harness initial={[p('a', '')]} />)
    const editor = r.getByTestId('editor')
    placeCaret(editor, 0, 0)
    fireEvent.compositionStart(editor)
    beforeInput(editor, 'insertCompositionText', 'ㅎ')
    editor.querySelector('[data-doc-block-index="0"]')!.textContent = '한'
    fireEvent.compositionEnd(editor, { data: '한' })
    const finalInsert = beforeInput(editor, 'insertText', '한')
    expect(finalInsert.defaultPrevented).toBe(true)
    expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks[0].text).toBe('한')
    expect(editor.textContent).toBe('한')
  })

  it('does not duplicate a final IME insertCompositionText event after compositionend', () => {
    const r = render(<Harness initial={[p('a', '')]} />)
    const editor = r.getByTestId('editor')
    placeCaret(editor, 0, 0)
    fireEvent.compositionStart(editor)
    beforeInput(editor, 'insertCompositionText', 'ㅎ')
    editor.querySelector('[data-doc-block-index="0"]')!.textContent = '한'
    fireEvent.compositionEnd(editor, { data: '한' })
    const finalInsert = beforeInput(editor, 'insertCompositionText', '한')
    expect(finalInsert.defaultPrevented).toBe(true)
    expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks[0].text).toBe('한')
    expect(editor.textContent).toBe('한')
  })

  it('commits from native DOM after compositionend when no final input event arrives', async () => {
    const r = render(<Harness initial={[p('a', '')]} />)
    const editor = r.getByTestId('editor')
    placeCaret(editor, 0, 0)
    fireEvent.compositionStart(editor)
    beforeInput(editor, 'insertCompositionText', 'ㅎ')
    editor.querySelector('[data-doc-block-index="0"]')!.textContent = '한'
    fireEvent.compositionEnd(editor, { data: '' })
    await waitFor(() => expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks[0].text).toBe('한'))
    expect(editor.textContent).toBe('한')
  })

  it('keeps the composing DOM frozen across a rerender after compositionend', async () => {
    const r = render(<Harness initial={[p('a', '')]} version={0} />)
    const editor = r.getByTestId('editor')
    placeCaret(editor, 0, 0)
    fireEvent.compositionStart(editor)
    beforeInput(editor, 'insertCompositionText', 'ㅎ')
    editor.querySelector('[data-doc-block-index="0"]')!.textContent = '한'
    fireEvent.compositionEnd(editor, { data: '' })
    r.rerender(<Harness initial={[p('a', '')]} version={1} />)
    expect(editor.textContent).toBe('한')
    await waitFor(() => expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks[0].text).toBe('한'))
    expect(editor.textContent).toBe('한')
  })

  it('commits from the first final input event when compositionend has no data', () => {
    const r = render(<Harness initial={[p('a', '')]} />)
    const editor = r.getByTestId('editor')
    placeCaret(editor, 0, 0)
    fireEvent.compositionStart(editor)
    beforeInput(editor, 'insertCompositionText', 'ㅎ')
    fireEvent.compositionEnd(editor, { data: '' })
    expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks[0].text).toBe('')
    const finalInsert = beforeInput(editor, 'insertCompositionText', '한')
    expect(finalInsert.defaultPrevented).toBe(true)
    expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks[0].text).toBe('한')
    expect(editor.textContent).toBe('한')
  })

  it('commits composition against the start snapshot when host state changes before commit', async () => {
    const applied: Array<readonly { op: string; path: string; value?: unknown }[]> = []
    const r = render(<ControlledHarness blocks={[p('a', '한')]} onApply={patches => applied.push(patches)} />)
    const editor = r.getByTestId('editor')
    placeCaret(editor, 0, 1)
    fireEvent.compositionStart(editor)
    beforeInput(editor, 'insertCompositionText', 'ㄱ')
    editor.querySelector('[data-doc-block-index="0"]')!.textContent = '한ㄱ'
    fireEvent.compositionEnd(editor, { data: '' })
    r.rerender(<ControlledHarness blocks={[p('a', '')]} onApply={patches => applied.push(patches)} />)
    await waitFor(() => expect(applied.at(-1)?.[0]?.value).toBe('한ㄱ'))
    expect(editor.textContent).toBe('한ㄱ')
  })

  it('flushes a pending commit before the next composition starts', async () => {
    const r = render(<Harness initial={[p('a', '')]} />)
    const editor = r.getByTestId('editor')
    placeCaret(editor, 0, 0)
    fireEvent.compositionStart(editor)
    beforeInput(editor, 'insertCompositionText', '한')
    editor.querySelector('[data-doc-block-index="0"]')!.textContent = '한'
    fireEvent.compositionEnd(editor, { data: '한' })
    fireEvent.compositionStart(editor)
    beforeInput(editor, 'insertCompositionText', 'ㄱ')
    editor.querySelector('[data-doc-block-index="0"]')!.textContent = '한ㄱ'
    await waitFor(() => expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks[0].text).toBe('한'))
    fireEvent.compositionEnd(editor, { data: 'ㄱ' })
    await waitFor(() => expect(JSON.parse(r.getByTestId('state').textContent || '{}').blocks[0].text).toBe('한ㄱ'))
    expect(editor.textContent).toBe('한ㄱ')
  })
})

function Harness({ initial, version = 0 }: { initial: TestBlock[]; version?: number }) {
  const [blocks, setBlocks] = useState(initial)
  const surface = useEditableDocumentSurface({
    blocks,
    adapter,
    ops: { apply: patches => setBlocks(current => applyPatches(current, patches)) },
    label: 'Document',
  })
  return (
    <div data-version={version}>
      <div data-testid="editor" ref={surface.containerRef} {...surface.containerProps} />
      <pre data-testid="state">{JSON.stringify({ blocks })}</pre>
    </div>
  )
}

function ControlledHarness({
  blocks,
  onApply,
}: {
  blocks: TestBlock[]
  onApply: (patches: readonly { op: string; path: string; value?: unknown }[]) => void
}) {
  const surface = useEditableDocumentSurface({
    blocks,
    adapter,
    ops: { apply: onApply },
    label: 'Document',
  })
  return (
    <div>
      <div data-testid="editor" ref={surface.containerRef} {...surface.containerProps} />
    </div>
  )
}

function p(id: string, text: string): TestBlock {
  return { id, kind: 'paragraph', text }
}

function beforeInput(el: Element, inputType: string, data?: string): Event {
  const event = new Event('beforeinput', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'inputType', { value: inputType })
  Object.defineProperty(event, 'data', { value: data ?? null })
  fireEvent(el, event)
  return event
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

function applyPatches(blocks: TestBlock[], patches: readonly { op: string; path: string; value?: unknown }[]): TestBlock[] {
  const next = structuredClone(blocks) as TestBlock[]
  for (const patch of patches) {
    const parts = patch.path.split('/').slice(1)
    const index = Number(parts[1])
    if (patch.op === 'add') next.splice(index, 0, patch.value as TestBlock)
    else if (patch.op === 'remove') next.splice(index, 1)
    else if (patch.op === 'replace' && parts[2] === 'text') next[index]!.text = patch.value as string
  }
  return next.map((block, index) => ({ ...block, id: block.id === 'new' ? `new-${index}` : block.id }))
}
