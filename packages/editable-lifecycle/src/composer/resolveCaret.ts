/**
 * W3C Selection API → DocPos.
 * 호스트가 각 block 을 `data-block-index="N"` + `data-block-kind` 마크로 렌더한 전제.
 * text block: focusOffset 그대로 / atomic block: blockIdx 또는 blockIdx+1 (시각 중심점 비교).
 * 실제로는 브라우저가 atomic 양옆 클릭 시 인접 text node 에 caret 을 두므로 atomic-내부 caret 은 드물다.
 */
export interface DocPos {
  blockIdx: number
  offset: number
}

export function resolveCaret(root: HTMLElement, selection: Selection | null): DocPos | null {
  if (!selection || selection.rangeCount === 0) return null
  const node = selection.focusNode
  if (!node || !root.contains(node)) return null
  // 케이스 1: focusNode 가 root 자체이고 focusOffset 으로 인접 child 를 가리킴 (programmatic).
  if (node === root) {
    const child = root.childNodes[selection.focusOffset] as HTMLElement | undefined
    const prev = root.childNodes[selection.focusOffset - 1] as HTMLElement | undefined
    const idx = readIdx(child) ?? readIdx(prev)
    if (idx === null) return null
    // child 면 그 block 시작점, prev 면 prev block 다음 = idx+1 의미
    return { blockIdx: child ? idx : idx + 1, offset: 0 }
  }
  const blockEl = findBlockAncestor(node, root)
  if (!blockEl) return null
  const idx = readIdx(blockEl)
  if (idx === null) return null
  if (blockEl.dataset.blockKind && blockEl.dataset.blockKind !== 'text') {
    return { blockIdx: idx, offset: 0 }
  }
  return { blockIdx: idx, offset: selection.focusOffset }
}

function readIdx(el: HTMLElement | undefined): number | null {
  if (!el || el.dataset?.blockIndex === undefined) return null
  const n = Number(el.dataset.blockIndex)
  return Number.isNaN(n) ? null : n
}

function findBlockAncestor(start: Node, root: HTMLElement): HTMLElement | null {
  let n: Node | null = start
  while (n && n !== root) {
    if (n.nodeType === 1) {
      const el = n as HTMLElement
      if (el.dataset.blockIndex !== undefined) return el
    }
    n = n.parentNode
  }
  return null
}

