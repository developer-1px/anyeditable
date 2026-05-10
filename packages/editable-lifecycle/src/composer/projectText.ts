import type { ComposerDoc } from './schema.js'

export function getBlockText(doc: ComposerDoc, blockIdx: number): string {
  const b = doc.blocks[blockIdx]
  return b?.kind === 'text' ? b.text : ''
}

/** beforeinput 시점의 doc text 에 e 의 결과를 caret 위치에 맞춰 미리 적용 — trigger 검출용. */
export function projectText(text: string, e: InputEvent, caret: number): string {
  const insert = insertData(e)
  if (insert !== null) return text.slice(0, caret) + insert + text.slice(caret)
  if (e.inputType === 'deleteContentBackward') {
    return caret > 0 ? text.slice(0, caret - 1) + text.slice(caret) : text
  }
  return text
}

function insertData(e: InputEvent): string | null {
  const t = e.inputType
  if ((t === 'insertText' || t === 'insertReplacementText') && typeof e.data === 'string') return e.data
  if (t === 'insertFromPaste' || t === 'insertFromDrop') {
    return (e as InputEvent & { dataTransfer?: DataTransfer }).dataTransfer?.getData('text/plain') ?? null
  }
  return null
}
