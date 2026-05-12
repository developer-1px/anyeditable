import type { AtomicKind } from './schema.js'

export interface TriggerHint {
  kind: AtomicKind
  query: string
  startOffset: number
}

const BOUNDARY = /[\s ]|^$/

/**
 * 마지막 trigger 문자(`@`/`/`)를 텍스트 뒤에서 찾고, 그 직전이 단어 경계(공백/문자열 시작)이면 hint 반환.
 * 표준 어휘 — Slack/Discord 사실상 표준의 trigger boundary 규칙.
 */
export function detectTrigger(
  text: string,
  cursor: number,
  triggers: Record<string, AtomicKind>,
  minQueryLength = 0,
): TriggerHint | null {
  for (let i = cursor - 1; i >= 0; i--) {
    const ch = text[i] ?? ''
    if (BOUNDARY.test(ch)) return null
    const kind = triggers[ch]
    if (!kind) continue
    const before = i === 0 ? '' : (text[i - 1] ?? '')
    if (!BOUNDARY.test(before)) return null
    const query = text.slice(i + 1, cursor)
    if (query.length < minQueryLength) return null
    return { kind, query, startOffset: i }
  }
  return null
}
