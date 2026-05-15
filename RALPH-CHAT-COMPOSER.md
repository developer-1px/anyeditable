---
ralph: @interactive-os/anyeditable/chat-composer
version: 0.3.0-spec.1
identity: dogfooding (@interactive-os/aria-kernel + zod-crud)
scope: single-user, single-paragraph, atomic-embed only
status: ✅ shipped (v0.3.0) · iter 28 · 24 findings · 6 issues filed · 18 self-resolved
artifacts:
  - kernel: packages/@interactive-os/anyeditable/src/composer/ (11 모듈, gzip 5.9 KB)
  - demo:   apps/composer-demo/ (Vite real-browser smoke)
  - tests:  72 passing across 12 files
  - findings: DOGFOOD-FINDINGS.md (24 항목 + 가족 invariant insights)
---

# Mission

`@interactive-os/aria-kernel` 과 `zod-crud` 를 **개밥먹기**하여, contenteditable 기반
chat composer 의 **mention(@) + slash-command(/)** 입력을 헤드리스로 제공한다.

— Lexical/ProseMirror 류를 끌어오지 않고 두 패키지 합성만으로 정직하게 풀린다는
   사실 자체가 산출물의 1차 가치다. 합성이 깨지면 이번 loop 의 실패다.

# 정체성 (3-패키지 가족 invariant — 위반 시 즉시 reject)

- I1. **markup·JSX·design token 0건** (props 만 반환)
- I2. **어휘를 표준에 닫는다**:
        WHATWG Input Events L2 · W3C Selection API · WAI-ARIA APG Combobox · RFC 6902
        외부에서 가져오지 않은 신규 어휘 금지 (grep first)
- I3. **`useComboboxPattern` 재사용** — popover ARIA 자체 구현 금지
- I4. **`useJson` 재사용** — 자체 모델/undo 구현 금지
- I5. **세 패키지 의존 방향 1차 단방향**:
        @interactive-os/anyeditable ─▶ @interactive-os/aria-kernel
        @interactive-os/anyeditable ─▶ zod-crud
        역방향·횡단 의존 금지
- I6. **Model is truth** — `beforeinput.preventDefault()` 후 ops 발행 (IME 예외 §C)

# 산출물

## D1. Schema (zod-crud 위)

```ts
const ComposerDoc = z.object({
  blocks: z.array(z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('text'),    text: z.string() }),
    z.object({ kind: z.literal('mention'), id: z.string(), label: z.string() }),
    z.object({ kind: z.literal('command'), name: z.string() }),
  ])),
})
```

- Inline-only flat array. block-level 트리 금지 (out of scope)
- discriminator `kind` literal — atomic 식별 SSOT

## D2. Hook 시그니처

```ts
export function useEditableComposer(opts: {
  doc: z.infer<typeof ComposerDoc>
  ops: JsonOps
  triggers: Record<string, AtomicKind>
  onSubmit?: () => void
}): {
  rootProps: HTMLAttributes<HTMLElement>
  atomicProps: (blockIndex: number) => HTMLAttributes
  trigger: { kind: AtomicKind; query: string; range: Range } | null
}
```

## D3. Demo 시나리오 (6 항목)

1. `@bob check /run` → Enter → onSubmit
2. `@` 입력 → user popover ↑↓ Enter 선택 → mention chip 삽입
3. `/` 입력 → command popover 동일
4. chip 위 Backspace 1회 → 통째 삭제
5. chip 옆 Arrow 1회 → 통과
6. 한글 IME 정상 입력 + paste 시 plain text

## D4. 테스트

- vitest unit: JSON Patch ops 시퀀스 (DOM 없이)
- @testing-library/react + userEvent: keyboard·paste·composition
- 각 트리거 insert / Esc cancel / blur abandon 3 경로
- IME: composition 중 ops 보류, end 후 1회 ops

# 비-범위

- multi-block 트리 / inline marks / 멀티라인 코드블록
- decoration / collab cursor / comment
- HTML paste sanitize (plain text 강제)
- Yjs / Automerge / 협업
- position mapping through ops
- 표 / 이미지 / 파일 첨부

# 검증 게이트 (6개, 1개라도 ✗ → 회귀)

1. typecheck
2. test (커버리지 ≥ 80%)
3. invariant grep (I1·I2·I5)
4. demo 6 항목 ✓
5. 의존성: lexical/prosemirror/slate 미참조
6. bundle size: gzip 8KB 이하 (peer 제외)

# 종료 조건

D1·D2·D3·D4 + 6 게이트 ✓ + DOGFOOD-FINDINGS.md ≥ 1건.

# 참조

- aria-kernel `PATTERNS.md` `useComboboxPattern`
- aria-kernel `INVARIANTS.md` B11
- zod-crud `SPEC.md` §5
- WHATWG Input Events Level 2
- W3C Selection API
- WAI-ARIA APG Editable Combobox
