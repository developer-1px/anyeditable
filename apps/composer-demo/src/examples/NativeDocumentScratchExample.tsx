import { useCallback, useLayoutEffect, useRef, useState } from 'react'

interface ScratchBlock {
  id: string
  kind: 'paragraph' | 'heading'
  text: string
}

const INITIAL_BLOCKS: ScratchBlock[] = [
  { id: 's1', kind: 'paragraph', text: '' },
  { id: 's2', kind: 'heading', text: '' },
]

export function NativeDocumentScratchExample() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [blocks, setBlocks] = useState<ScratchBlock[]>(INITIAL_BLOCKS)
  const [trace, setTrace] = useState<string[]>([])
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks

  const pushTrace = useCallback((label: string, event?: Event) => {
    const root = rootRef.current
    const native = event as InputEvent | CompositionEvent | KeyboardEvent | undefined
    const line = `${new Date().toISOString()} ${label} ${JSON.stringify({
      type: native?.type,
      inputType: native && 'inputType' in native ? native.inputType : undefined,
      data: native && 'data' in native ? native.data : undefined,
      key: native && 'key' in native ? native.key : undefined,
      isComposing: native && 'isComposing' in native ? native.isComposing : undefined,
      defaultPrevented: native?.defaultPrevented,
      selection: snapshotSelection(root),
      dom: readBlocksFromDom(root),
      state: blocksRef.current.map(block => block.text),
    })}`
    console.info('[native-document-scratch:trace]', line)
    setTrace(current => [line, ...current].slice(0, 100))
  }, [])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || root.childElementCount > 0) return
    renderBlocks(root, blocksRef.current)
  }, [])

  const syncStateFromDom = useCallback(() => {
    const root = rootRef.current
    const next = readBlocksFromDom(root)
    if (next.length > 0) setBlocks(next)
  }, [])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const handleBeforeInput = (event: Event) => {
      const native = event as InputEvent
      pushTrace('scratch.beforeinput', native)
      if (native.isComposing || native.inputType === 'insertCompositionText') return
      if (native.inputType === 'insertParagraph') {
        native.preventDefault()
        splitCurrentBlock(root)
        syncStateFromDom()
        pushTrace('scratch.split', native)
        return
      }
      if (native.inputType === 'deleteContentBackward' && isAtBlockStart(root)) {
        native.preventDefault()
        mergeWithPreviousBlock(root)
        syncStateFromDom()
        pushTrace('scratch.mergeBackward', native)
      }
    }

    const handleInput = (event: Event) => {
      const native = event as InputEvent
      syncStateFromDom()
      pushTrace('scratch.input', native)
    }

    root.addEventListener('beforeinput', handleBeforeInput)
    root.addEventListener('input', handleInput)
    return () => {
      root.removeEventListener('beforeinput', handleBeforeInput)
      root.removeEventListener('input', handleInput)
    }
  }, [pushTrace, syncStateFromDom])

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    pushTrace('scratch.keydown', event.nativeEvent)
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Backspace' && isAtBlockStart(rootRef.current)) {
      event.preventDefault()
      mergeWithPreviousBlock(rootRef.current)
      syncStateFromDom()
      pushTrace('scratch.mergeBackward.keydown', event.nativeEvent)
    }
  }, [pushTrace, syncStateFromDom])

  const handleBeforeInput = useCallback((event: React.FormEvent<HTMLDivElement>) => {
    const native = event.nativeEvent as InputEvent
    pushTrace('react.beforeinput', native)
    if (native.isComposing || native.inputType === 'insertCompositionText') return
  }, [pushTrace, syncStateFromDom])

  const handleInput = useCallback((event: React.FormEvent<HTMLDivElement>) => {
    pushTrace('react.input', event.nativeEvent)
  }, [pushTrace, syncStateFromDom])

  return (
    <div className="example native-document-example">
      <div className="playground">
        <h3>실행: native document scratch</h3>
        <div
          ref={rootRef}
          className="document-surface native-document-scratch"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Native document scratch"
          aria-multiline="true"
          data-testid="native-document-scratch"
          onBeforeInput={handleBeforeInput}
          onInput={handleInput}
          onCompositionStart={event => pushTrace('scratch.compositionstart', event.nativeEvent)}
          onCompositionUpdate={event => pushTrace('scratch.compositionupdate', event.nativeEvent)}
          onCompositionEnd={event => pushTrace('scratch.compositionend', event.nativeEvent)}
          onKeyDown={handleKeyDown}
        />
        <p className="hint">IME와 일반 입력은 native DOM을 먼저 믿고, input 이벤트에서 state가 따라옵니다. Enter/Backspace 구조 변경만 직접 처리합니다.</p>
      </div>
      <div className="observe">
        <h3>관찰</h3>
        <pre data-testid="native-document-state">{JSON.stringify({ blocks }, null, 2)}</pre>
        <h3>Native trace</h3>
        <pre data-testid="native-document-trace">{trace.join('\n')}</pre>
      </div>
    </div>
  )
}

function renderBlocks(root: HTMLElement, blocks: ScratchBlock[]) {
  root.replaceChildren()
  for (const [index, block] of blocks.entries()) {
    root.appendChild(createBlockElement(root.ownerDocument, block, index))
  }
}

function createBlockElement(document: Document, block: ScratchBlock, index: number): HTMLElement {
  const el = document.createElement(block.kind === 'heading' ? 'h2' : 'p')
  el.dataset.scratchBlockIndex = String(index)
  el.dataset.scratchBlockId = block.id
  el.dataset.scratchBlockKind = block.kind
  setBlockText(el, block.text)
  return el
}

function readBlocksFromDom(root: HTMLElement | null): ScratchBlock[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>('[data-scratch-block-index]')).map((el, index) => ({
    id: el.dataset.scratchBlockId || `scratch-${index}`,
    kind: el.dataset.scratchBlockKind === 'heading' ? 'heading' : 'paragraph',
    text: el.textContent ?? '',
  }))
}

function splitCurrentBlock(root: HTMLElement | null) {
  const point = getSelectionPoint(root)
  if (!root || !point) return
  const block = point.block
  const text = block.textContent ?? ''
  const before = text.slice(0, point.offset)
  const after = text.slice(point.offset)
  setBlockText(block, before)
  const next = createBlockElement(root.ownerDocument, {
    id: crypto.randomUUID(),
    kind: 'paragraph',
    text: after,
  }, Number(block.dataset.scratchBlockIndex ?? 0) + 1)
  block.after(next)
  renumberBlocks(root)
  restoreCaret(next, 0)
}

function mergeWithPreviousBlock(root: HTMLElement | null) {
  const point = getSelectionPoint(root)
  if (!root || !point) return
  const prev = point.block.previousElementSibling as HTMLElement | null
  if (!prev?.matches('[data-scratch-block-index]')) return
  const prevText = prev.textContent ?? ''
  setBlockText(prev, prevText + (point.block.textContent ?? ''))
  point.block.remove()
  renumberBlocks(root)
  restoreCaret(prev, prevText.length)
}

function isAtBlockStart(root: HTMLElement | null): boolean {
  const point = getSelectionPoint(root)
  return Boolean(point && point.offset === 0)
}

function getSelectionPoint(root: HTMLElement | null): { block: HTMLElement; offset: number } | null {
  if (!root) return null
  const selection = root.ownerDocument.getSelection()
  if (!selection || !selection.isCollapsed) return null
  const node = selection.anchorNode
  const start = node?.nodeType === Node.ELEMENT_NODE ? node as Element : node?.parentElement
  const block = start?.closest('[data-scratch-block-index]') as HTMLElement | null
  if (!block || !root.contains(block)) return null
  return { block, offset: offsetInBlock(block, selection.anchorNode ?? block, selection.anchorOffset) }
}

function offsetInBlock(block: HTMLElement, node: Node, nodeOffset: number): number {
  let offset = 0
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current) {
    const text = current.textContent ?? ''
    if (current === node) return offset + Math.min(nodeOffset, text.length)
    offset += text.length
    current = walker.nextNode()
  }
  return 0
}

function restoreCaret(block: HTMLElement, offset: number) {
  const range = block.ownerDocument.createRange()
  const text = firstTextNode(block)
  if (text) {
    range.setStart(text, Math.min(offset, text.textContent?.length ?? 0))
  } else {
    range.setStart(block, 0)
  }
  range.collapse(true)
  const selection = block.ownerDocument.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

function setBlockText(block: HTMLElement, text: string) {
  block.replaceChildren()
  if (text.length > 0) {
    block.appendChild(block.ownerDocument.createTextNode(text))
    return
  }
  const br = block.ownerDocument.createElement('br')
  br.dataset.scratchEmpty = 'true'
  block.appendChild(br)
}

function firstTextNode(block: HTMLElement): Text | null {
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  return walker.nextNode() as Text | null
}

function renumberBlocks(root: HTMLElement) {
  Array.from(root.querySelectorAll<HTMLElement>('[data-scratch-block-index]')).forEach((el, index) => {
    el.dataset.scratchBlockIndex = String(index)
  })
}

function snapshotSelection(root: HTMLElement | null): unknown {
  if (!root) return null
  const selection = root.ownerDocument.getSelection()
  if (!selection) return null
  return {
    anchorOffset: selection.anchorOffset,
    focusOffset: selection.focusOffset,
    isCollapsed: selection.isCollapsed,
    anchorText: selection.anchorNode?.textContent,
    focusText: selection.focusNode?.textContent,
  }
}
