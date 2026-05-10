import type { ComposerDoc } from './schema.js'

export function getBlockText(doc: ComposerDoc, blockIdx: number): string {
  const b = doc.blocks[blockIdx]
  return b?.kind === 'text' ? b.text : ''
}

/** beforeinput 시점의 doc text 에 e 의 결과를 미리 적용한 가상 텍스트 — trigger 검출용. */
export function projectText(text: string, e: InputEvent): string {
  if (e.inputType === 'insertText' && typeof e.data === 'string') return text + e.data
  if (e.inputType === 'deleteContentBackward') return text.slice(0, -1)
  return text
}
