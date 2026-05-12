# Dogfood Findings

`@p/aria-kernel` + `zod-crud` 를 chat composer 빌드에 사용하며 발견되는
어휘 부족·DX 갭·invariant 위반 후보를 누적한다.

종료 조건: ≥ 1건. 0건이면 우회로 푼 신호.

## TL;DR — 27 findings, 6 issues filed, 21 self-resolved, 2 integration guides

| # | 카테고리 | 위치 | 상태 |
|---|---|---|---|
| F1 | zod-crud DX | `JsonOps.apply()` throwing variant for fire-and-forget | [#54](https://github.com/developer-1px/zod-crud/issues/54) |
| F2 | aria-kernel DX | `NormalizedData` builder for ad-hoc lists | [#134](https://github.com/developer-1px/aria-kernel/issues/134) |
| F3 | 가족 어휘 SSOT | local `Patch` → zod-crud `JsonPatchOperation` | 자체 해결 (iter 3) |
| F4 | zod-crud TS | `applyPatch` strict TS inference | [#55](https://github.com/developer-1px/zod-crud/issues/55) |
| F5 | zod-crud peer | zod ^4 강제 명시 | 자체 해결 (zod v4 채택) |
| F6 | aria-kernel UX | `useComboboxPattern` `/patterns` subpath | 통합 가이드 |
| F7 | 통합 packaging | vitest dedupe + deps.inline | 통합 가이드 |
| F8 | aria-kernel API | `useComboboxPattern` ephemeral state plumbing | [#135](https://github.com/developer-1px/aria-kernel/issues/135) + 자체 해결 (`useEphemeralCollection`) |
| F9 | kernel | IME compositionend → ops 단발 발행 | 자체 해결 (iter 7) |
| F10 | zod-crud feature | transaction merge for keystroke-burst undo | [#56](https://github.com/developer-1px/zod-crud/issues/56) |
| F11 | kernel UX | Cmd+Z / Cmd+Shift+Z 키보드 wire | 자체 해결 (iter 9) |
| F12 | kernel | DOM Selection ↔ DocPos resolver | 자체 해결 (iter 10) |
| F13 | kernel | 정방향 삭제 (Delete key) | 자체 해결 (iter 11) |
| F14 | kernel | range selection delete/replace (single block) | 자체 해결 (iter 13) |
| F15 | kernel UX | commitAtomic 후 DOM caret 복원 | 자체 해결 (iter 14) |
| F16 | kernel | cross-block range delete (atomic 포함) | 자체 해결 (iter 15) |
| F17 | kernel | Shift+Enter `insertLineBreak` | 자체 해결 (iter 18) |
| F18 | 가족 어휘 SSOT | `BLUR_RACE_DELAY_MS` 단일 export 제안 | [#136](https://github.com/developer-1px/aria-kernel/issues/136) |
| F19 | kernel | atomic 양옆 caret 휴리스틱 정밀화 | 자체 해결 (iter 21) |
| F20 | kernel race | onKeyDown `defaultPrevented` 가드 | 자체 해결 (iter 22, story test 발견) |
| F21 | publish | peer optional + README/CHANGELOG 동봉 | 자체 해결 (iter 23) |
| F22 | kernel UX | `minQueryLength` 옵션 | 자체 해결 (iter 24) |
| F23 | a11y | `aria-multiline=true` (Shift+Enter 정합) | 자체 해결 (iter 25) |
| F24 | tooling | `apps/composer-demo` Vite 실브라우저 smoke | 자체 해결 (iter 26) |
| F25 | kernel arch | React reconcile vs contenteditable textNode → self DOM reconciler | 자체 해결 (iter 28, Lexical-concept) |
| F26 | kernel race | React state batching across rapid keystrokes → `useSyncDocOps` | 자체 해결 (iter 29) |
| F27 | aria-kernel API | combobox needs `<input onChange>` — primer for contenteditable | 자체 해결 + 후속 제안 (iter 30) |

### 6 issues filed (cross-package)

- **zod-crud**: [#54](https://github.com/developer-1px/zod-crud/issues/54) `apply()` throwing · [#55](https://github.com/developer-1px/zod-crud/issues/55) strict TS · [#56](https://github.com/developer-1px/zod-crud/issues/56) transaction merge
- **aria-kernel**: [#134](https://github.com/developer-1px/aria-kernel/issues/134) `NormalizedData` builder · [#135](https://github.com/developer-1px/aria-kernel/issues/135) combobox state (작동 증명 댓글) · [#136](https://github.com/developer-1px/aria-kernel/issues/136) `BLUR_RACE_DELAY_MS` SSOT

### 가족 invariant insights

1. **Standards-closed vocabulary (I2)** — `Patch = JsonPatchOperation`, `useComboboxPattern`, `aria-multiline` 모두 한 SSOT 에서. 행동 추가 시 어휘 동기 누락은 a11y 회귀 (F23).
2. **Render lag (F8)** — derived state 를 패턴에 어댑트할 때 `useMemo` 의 dep stale 가 보이지 않는 race. `setCarried(prev => reduce(...))` 패턴이 정답.
3. **Operational constants drift (F18)** — magic 100ms 같은 비-spec 상수가 두 패키지에 중복 → 가족 SSOT 필요.
4. **RFC 6902 batch atomicity (F14)** — 같은 path 에 대한 두 patch 직렬 적용 시 두 번째가 stale state 위에서 동작 → 단일 replace 로 통합이 정답.
5. **Live demo as ship contract (F24)** — `apps/composer-demo/App.tsx` 가 internals 0 import — 동작하면 dogfooding 계약 성립.

---

## F1 · zod-crud — `JsonOps.patch()` 의 결과형이 fire-and-forget 사용에 무겁다

**상황:** chat composer kernel 의 `beforeinput` 핸들러는 keystroke 단위로 patch 를 발행한다.
실패는 schema 위반 = 프로그래밍 버그이므로 throw 가 자연스럽다.

**현재:** `ops.patch(operations) → JsonResult` (rich error info). keystroke 마다 result 를 검사하기엔 무겁고,
대부분의 호출 지점에서 result 를 버린다.

**제안:** `ops.apply(operations)` (throw on violation) + 기존 `ops.patch()` 는 result 변종으로 유지.
또는 README 에 "fire-and-forget 시 result 무시 OK, throw 변종은 별도 helper" 명시.

**Issue:** https://github.com/developer-1px/zod-crud/issues/54

---

## F2 · aria-kernel — `useComboboxPattern` 입력에 `NormalizedData` 가 강제됨

**상황:** chat trigger query 가 매 keystroke 바뀐다 → suggestion list 를 매번 재계산.
`useComboboxPattern(data, onEvent, opts)` 의 `data: NormalizedData` 를 매번 만들어줘야 한다.

**현재:** `NormalizedData` builder 가 없거나 (찾기 어려움), 사용자가 직접 `{ entities, ids }` 모양을 빌드.

**제안:** `composeNormalizedFromList<T>(items, { getId, getLabel, getDisabled? })` helper export.
또는 `useComboboxPattern` 이 raw list 도 받는 overload 추가.

**Issue:** https://github.com/developer-1px/aria-kernel/issues/134

---

## F3 · 정체성 가족 — `JsonPatchOperation` 어휘 SSOT 가 zod-crud 에 있음

**상황:** @p/anyeditable kernel 이 patch 타입을 자체 정의하면 zod-crud 와 어휘 분기.

**현재 처리:** `composer/blockOps.ts` 안 `Patch` 를 자체 선언했으나 실제로는 `JsonPatchOperation` 과 동일 shape.

**조치:** iter ≥3 에서 `JsonPatchOperation` 을 zod-crud 에서 import 하도록 교체. 가족 어휘 단일 SSOT.

**Issue 후보 제목:** (자체 조치 완료 — iter 3 에서 zod-crud `JsonPatchOperation` import 로 교체)

---

## F4 · zod-crud — `applyPatch` 의 schema 매개변수 타입 추론이 strict TS 에서 깨진다

**상황:** `applyPatch(ComposerDoc, doc, patches)` 호출 시
`exactOptionalPropertyTypes: true` 인 strict 프로젝트에서 `ZodObject<..., $strip>` 가
`ZodType<unknown, unknown, ...>` 에 assignable 하지 않다고 거절.

**현재 회피:** `as unknown as Parameters<typeof applyPatch>[0]` 로 cast.

**제안:** `applyPatch<S extends z.ZodType>(...)` 의 S 제약을 더 느슨하게 (`z.ZodTypeAny` 류) 또는
overload 로 `ZodObject` 를 직접 받는 시그니처 추가.

**Issue:** https://github.com/developer-1px/zod-crud/issues/55

---

## F5 · zod-crud — peerDependency zod ^4 강제

**상황:** zod-crud 가 `zod ^4.0.0` peer 강제. 기존 zod v3 프로젝트가 zod-crud 채택 시 v4 마이그레이션 필요.

**조치:** @p/anyeditable 도 v4 로 올림 (이번 iter). 합리적 선택 — zod v4 가 stable.
다만 README 에 "requires zod ^4" 명시가 강하면 도움.

---

## F6 · aria-kernel — `useComboboxPattern` 가 root export 가 아니라 `/patterns` subpath

**상황:** dogfood demo 작성 중 `import { useComboboxPattern } from '@p/aria-kernel'` 실패.
`@p/aria-kernel/patterns` 로 들어가야 함.

**현재 회피:** subpath import.

**평가:** README 에 `import { ... } from '@p/aria-kernel/axes'` 등 subpath 안내 있으나
P-tier patterns 가 root re-export 안 됨이 직관 어긋남. 트리쉐이킹 의도면 명시 필요.

**Issue 후보:** root index 에서 patterns 도 re-export 또는 README 에 "use subpath for patterns" 명시.

---

## F7 · 통합 packaging — peer 동시 dedupe 가이드 부재

**상황:** aria-kernel 을 file: 경로로 설치 시 자체 node_modules 의 React 가 우선되어
vitest 에서 "Cannot read properties of null (reading 'useState')" — React 인스턴스 중복.

**현재 회피:** `vitest.config.ts` 에 `resolve.dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime']`
+ `server.deps.inline: ['@p/aria-kernel']`.

**평가:** 가족 패키지 (aria-kernel + zod-crud + @p/anyeditable) 를 함께 쓰는 소비자가
같은 벽을 만남. README 또는 family-level integration 가이드에 dedupe 스니펫 권장.

**Issue 후보:** 가족 README 또는 별도 INTEGRATION.md 에 vitest/vite 설정 스니펫 게시.

---

## F8 · aria-kernel — `useComboboxPattern` 키보드 nav 가 NormalizedData 상태 reducer plumbing 을 요구한다

**상황:** chat composer 트리거 후 ArrowDown/Enter 로 mention 선택 시도 — 클릭은 동작하나 키보드 미동작.
패턴이 `expanded = isOpen(data, ROOT)`, `activeId = getFocus(data)` 로 데이터 기반이라
소비자가 `setData(d => reduce(d, e))` 로 UiEvent 를 다시 데이터에 적용해야 함.

**현재 회피:** keyboard nav 테스트 `it.skip`. 클릭 경로만 통과.

**난이도 — derived list 의 정합:** `fromList(filteredItems)` 가 매 keystroke 새 객체 →
`useState(fresh)` 의 lag, `meta(open/focus)` 보존 머지, render 사이의 stale items 가
모두 직접 풀어야 하는 문제.

**Issue:** https://github.com/developer-1px/aria-kernel/issues/135

**자체 해결 (iter 6):** `composer/useEphemeralCollection.ts` 작성 — issue #135 의 제안 B (Bridge helper)
구현체. `[data, dispatch]` 반환, 매 keystroke 의 derived items 와 carried meta(focus/open/expanded)
를 분리해 정합. 제안 B 가 동작함을 검증한 데모 코드로 issue 에 댓글 가능.

핵심 트릭:
- `fromList` 결과의 `meta.root` 은 fresh 가 결정 (carried 에 포함 X)
- carried 는 `focus`/`open`/`expanded` 만 — id 가 stale 하면 prune
- `setCarried(prev => ...)` 으로 reduce 안의 데이터를 prev 기반 재구성 (useMemo dep stale 회피)

---

## F9 · @p/anyeditable 자체 — IME compositionend → insertText ops 단발 발행 (자체 해결)

**상황:** v0.2.0 lifecycle 은 composition 동안 ops 를 게이트만 했고 compositionend 후
DOM ↔ model 정합 경로 부재. 한글 입력이 DOM 에는 들어가지만 zod-crud doc 에 없음 (정합 깨짐).

**iter 7 조치:** `useDomBridge.onCE` 에서 `event.data` (확정 텍스트)를
`insertTextPatch` 로 한 번에 발행. caret offset 갱신, trigger 재검출.
한글 `ㅎ→하→한` 시퀀스 → `compositionend(data='한')` → text='한' 회귀 테스트 통과.

**남은 과제 (별도 finding 필요 없음):**
- `insertCompositionText` 이벤트가 cancelable=false 인 브라우저에서도 우리 게이트 안전성
- `compositionend.data` 가 빈 문자열인 IME 취소 케이스 (테스트로 커버됨)
- 모바일 IME (iOS/Android) 의 `compositionend` 일관성 — 환경별 회귀 시나리오 별도 필요

---

## F10 · @p/anyeditable 자체 — 키스트로크 burst → 1 transaction (다음 iter 자체 해결)

**상황:** iter 8 에서 `useJsonDocument` 채택 후 undo 검증. 현재 `ops.apply(patches)` 가 매
beforeinput 마다 호출 → zod-crud history 가 키스트로크 1개당 1 step 기록.
"hello" 입력 후 Cmd+Z 5번 필요 — chat UX 결함.

**zod-crud 측 갭 없음:** `ops.patch([...])` 는 배열을 받아 1 step 으로 기록. 즉 batching 은
@p/anyeditable 책임.

**제안 조치:** kernel 에 transaction batcher 추가
- 같은 inputType (`insertText`) 의 연속 patch 를 microtask/idle 까지 누적 후 1회 발행
- atomic insert / delete / paste 는 즉시 commit (단발 의미 동작)
- compositionend 는 이미 단발 — OK

**Iter 9 결정 변경:** kernel-side batching 은 "model is single source of truth" invariant 와 충돌 (display lag).
History merge 는 zod-crud 책임 — issue 제출.

**Issue:** https://github.com/developer-1px/zod-crud/issues/56 (proposal A `transaction()`, B `coalesceWith`, C `historyMerge` config)

---

## F11 · @p/anyeditable 자체 — Cmd+Z / Cmd+Shift+Z 키보드 → onUndo/onRedo 콜백 (자체 해결)

**iter 9 조치:** `useEditableComposer({ onUndo, onRedo })` 옵션 추가, rootProps.onKeyDown 에서
`metaKey/ctrlKey + z` 감지하여 콜백 호출. demo 에서 `jd.history.undo/redo` wire.

**검증:** `Cmd+Z` → 'hi' → 'h', `Cmd+Shift+Z` → 'hi' 회귀 테스트 통과.

---

## F12 · @p/anyeditable 자체 — DOM Selection ↔ DocPos resolver (자체 해결)

**상황:** v0.2~iter 9 까지 caret 은 beforeinput 누적으로만 추적. 마우스 클릭·native arrow·
contenteditable 내부 selection 변화에 caret model 이 반응 안 함.

**iter 10 조치:**
- `composer/resolveCaret.ts` — pure W3C Selection API → `{ blockIdx, offset }` 변환기.
  - block 식별: `data-block-index="N"` + `data-block-kind="text|mention|command"` SSOT
  - text: focusOffset 그대로 / atomic: 앞·뒤 위치 → blockIdx 또는 blockIdx+1
- `useDomBridge` 에 `selectionchange` listener 부착 (composition 중 게이트).
- `useEditableComposer` API 확장: `blockProps(i)` (모든 block 에 spread) — atomic 은 `atomicProps` 와 함께.
- public surface: `resolveCaret`, `DocPos` export.

**테스트 (4):** text 블록 offset 매핑 / 외부 selection null / 마커 없는 ancestor null / null selection null. 모두 ✓.

**남은 과제:**
- 멀티 selection range (Shift+Arrow 선택) — 현재는 collapsed caret 만
- atomic block 클릭 시 앞/뒤 결정 — `compareBoundaryPoints` 휴리스틱, 시각 정렬 별도 검증 필요

---

## F13 · @p/anyeditable 자체 — 정방향 삭제 (Delete key, `deleteContentForward`) (자체 해결)

**iter 11 조치:** `deleteForwardPatch(blocks, blockIdx, offset)` 추가 + `handleBeforeInput` 의
`deleteContentForward` 분기. 텍스트 끝에서 다음 atomic 제거, 텍스트 중간이면 next char 삭제.

**테스트 (4):** mid-text / at-end → next atomic / atomic on caret / no-next noop. 모두 ✓.

---

## F14 · @p/anyeditable 자체 — Range selection delete/replace (자체 해결, 단일 text block scope)

**iter 13 조치:**
- `resolveRange(root, sel) → { start, end, collapsed } | null` — anchor↔focus doc-order 정규화
- `deleteRangePatch(blocks, sb, so, eb, eo)` — 단일 text block 안 range 삭제
- `handleBeforeInput` 에 `range?` 파라미터 추가
  - `insertText` + range → **단일 replace patch** (`text.slice(0,start) + data + text.slice(end)`)
    - 두 patch 직렬 적용 시 두 번째가 stale state 기반 → 'Xhey' 버그 발견 후 단일 replace 로 통합
  - `deleteContentBackward/Forward` + range → range 삭제만 (캐릭터 단발 무시)
- `useDomBridge` 가 매 beforeinput 시 `getSelection()` + `resolveRange` 로 range 주입

**테스트:** drag-select 'hey' → type 'X' → 'X' / select 'hi' → Backspace → '' / unit deleteRangePatch.

**Cross-block scope (v0.4):** atomic span 포함 multi-block range 는 별도 일.

---

## F15 · @p/anyeditable 자체 — commitAtomic 후 DOM caret 복원 (자체 해결)

**상황:** `commitAtomic` 이 model caret 을 `blockIdx+2/0` 로 갱신했지만 브라우저 DOM caret 은
이전 위치 (split 된 첫 text block) 에 그대로. 사용자가 다음 입력 시 chip 앞에 글자 삽입됨.

**iter 14 조치:**
- `usePendingCaret` (36줄, 별도 파일로 추출) — 매 render 후 pending caret 을 `data-block-index`
  marker 위치로 적용. setStart 실패 시 block start fallback.
- `commitAtomic` 이 `pendingCaret.current = next` 설정 → React 재렌더 → effect 가 DOM 적용 → clear.
- `useEditableComposer` 자체는 100줄 게이트 위반 (112) → effect 분리로 98줄로 회귀.

**테스트:** `@b` → click bob → type 'x' → 3 blocks `['', mention, 'x']` 확인.
**남은 한계:** atomic 양옆 caret 미세 조정.

---

## F16 · @p/anyeditable 자체 — Cross-block range delete (atomic 포함, 자체 해결)

**상황:** F14 의 단일 text block scope → multi-block (atomic span 포함) 확장.
사용자가 `'hi @bob check'` 의 `'i ' + chip + ' c'` 를 drag-select 후 Backspace / type 시.

**iter 15 조치:**
- `deleteRangePatch(blocks, sb, so, eb, eo)` — cross-block 일반화
  - startBlock 이 text → `text.slice(0,so)` + endBlock `text.slice(eo)` merge replace
  - startBlock 이 atomic → 전체 replace 로 text block 변환 (`{kind:'text', text: merged}`)
  - eb..sb+1 역순 remove (index shift 회피)
- `handleBeforeInput` 의 `insertText + range` 분기에 cross-block 머지 + insert 통합 (단일 path 가
  startText + data + endText 로 단일 replace patch 생성)

**테스트:** unit `text→atomic→text` `'heck'` merge / `atomic→text` 'rest' replace.

남은 v0.4 후보: 양옆 atomic 인접 caret 미세 조정 (compareBoundaryPoints 휴리스틱 정밀화).

---

## F17 · @p/anyeditable 자체 — Shift+Enter 줄바꿈 (`insertLineBreak`/`insertParagraph`) (자체 해결)

**상황:** Enter (no shift) → onSubmit 으로 가로채는 반면, Shift+Enter 는 native beforeinput
`insertLineBreak` (또는 일부 브라우저 `insertParagraph`) 가 fire 되어야 했으나 우리 handler 의
else branch 가 preventDefault 만 하고 ops 미발행 → 줄바꿈 누락.

**iter 18 조치:**
- `handleBeforeInput` 에 `insertLineBreak` / `insertParagraph` 분기 추가 — `\n` 단일 char insert
  와 동일 처리
- range-replace 로직과 paste-replace 가 중복되어 `rangeReplace`/`insertNoRange` 헬퍼로 추출
- 100줄 게이트 위반 (105줄) → 81줄로 회귀
- 테스트: `'a' + Shift+Enter + 'b'` → `'a\nb'`

**렌더링 책임:** consumer 가 `white-space: pre-wrap` 또는 `\n → <br>` 변환. 헤드리스는 `\n` text 만 갖는다.

---

## F18 · @p/anyeditable 자체 — root blur → trigger 자동 cancel (자체 해결)

**상황:** 사용자가 `@bob` popover 띄운 채 외부 클릭 시 popover 가 그대로 — Esc 만 cancel 가능.

**iter 19 조치:**
- `useDomBridge` 가 root 의 `blur` 리스너에서 100ms 후 `setTrigger(null)`
- `focus` 시 timer 취소 — combobox option 의 `mouseDown→activate` 가 blur 보다 먼저 fire 될 시간 확보 (de facto 100ms)
- 100줄 게이트 회피: `projectText.ts` 분리 (13줄), `useDomBridge` 90줄 회귀

**테스트:** popover 표시 → blur → 150ms 대기 → popover null. 통과.

**디자인 통찰:** aria-kernel `useComboboxPattern` 의 `closeOnBlurDelay: 100` 과 동일 패턴 — 가족 안 두 곳에서 같은 race 를 같은 방식으로 풀고 있음. 통일 가치 있음.

**Issue (가족 SSOT 제안):** https://github.com/developer-1px/aria-kernel/issues/136 — `BLUR_RACE_DELAY_MS` 단일 export

---

## F19 · @p/anyeditable 자체 — atomic 양옆 caret 휴리스틱 정밀화 (자체 해결)

**iter 10 의 한계:** atomic block 내부 caret 만 `compareBoundaryPoints(END_TO_START)` 로 앞/뒤 구분.
실제 브라우저는 atomic 양옆 클릭 시 인접 text node 에 caret 을 두므로 (focusNode = text),
이 휴리스틱은 거의 발동되지 않으며 단위 테스트 어려웠음.

**iter 21 조치:**
- focusNode 가 root 자체이고 focusOffset 으로 인접 child 를 가리키는 케이스 추가 (programmatic /
  드물게 브라우저가 parent 위에 caret 을 둘 때)
- child = childNodes[focusOffset] 또는 prev = childNodes[focusOffset-1] 의 data-block-index 읽기
- child 매치 → 그 block 시작 / prev 만 매치 → prev block 다음 = idx+1 위치
- atomic-내부 `isCaretAfterAtomic` 헬퍼 제거 — 단순화. atomic 내부 caret 은 단순히 `{blockIdx, 0}`

**테스트:** atomic 좌·우 edge 클릭 회귀 (programmatic setStart on root + offset). 둘 다 통과.

**남은 케이스:** 시각적으로 atomic 정중앙을 클릭한 마우스 case — getBoundingClientRect 와 caretRangeFromPoint 별도 검증 필요. v0.4.

---

## F20 · @p/anyeditable 자체 — onKeyDown 의 `defaultPrevented` 가드 (자체 해결)

**상황:** 데모에서 `<div onKeyDown={(e) => { onKeyDown(e); c.rootProps.onKeyDown?.(e) }}>` 패턴.
trigger active + Enter 시 combobox 가 활성화 → `commitAtomic` → `setTrigger(null)` 발사.
하지만 같은 event tick 에서 React state 가 아직 flush 안 됐기 때문에 `c.rootProps.onKeyDown` 이
`trigger` 를 여전히 truthy 로 보고, 그러나 더 큰 문제 — Enter 가 fall-through 되어
**onSubmit 도 함께 fire**. iter 22 story test 가 발견: spy 1번 기대했는데 2번 호출.

**iter 22 조치:** `useEditableComposer.onKeyDown` 시작에 `if (e.defaultPrevented) return`.
combobox 등 upstream handler 가 e.preventDefault() 한 후엔 우리는 처리하지 않음.

**테스트:** end-to-end story (이번 iter 작성) — 13 finding 합성이 1번 submit 만 호출.

---

## E2E story 테스트 (iter 22, 1건)

`type → mention → space → command → IME → undo → resubmit` 회귀 — 13개 finding 가 한 사용자 흐름에서 모두 함께 동작함을 검증. 가족 dogfooding 의 합성 정합성 박제.

---

## F21 · 출하 readiness — peer 명시화 + README/CHANGELOG 패키지 동봉 (자체 해결)

**iter 23 조치:**
- `peerDependencies` 에 `@p/aria-kernel`, `zod-crud` 추가 + `peerDependenciesMeta.optional: true`
  - v0.2 `useEditable` 만 쓰는 consumer 는 둘 다 설치 불필요
  - v0.3 chat composer 사용 시 install 안내가 명확
- `files: ["dist", "README.md", "CHANGELOG.md"]` 로 동봉
- root README/CHANGELOG 를 패키지 안에 복사 (symlink 는 npm pack 에서 제외됨)

**npm pack dry-run:** 12.1 KB 타르볼, 27 파일, unpacked 41.8 KB. v0.3.0 출하 가능 상태.

---

## F22 · @p/anyeditable 자체 — `minQueryLength` 옵션 (트리거 즉시 popover 지연) (자체 해결)

**iter 24 조치:** `useEditableComposer({ minQueryLength: 1 })` — bare `@` 만으론 popover 미표시, `@b` 부터.
일부 채팅 앱이 채택한 UX (트리거만 누르고 popover 가 즉시 떠서 시야 가리는 문제 회피).

- `detectTrigger(text, cursor, triggers, minQueryLength?)` 4번째 인자 추가
- `useEditableComposer.minQueryLength?: number` (default 0) 옵션 통과
- `stateRef` 에 영속, `useDomBridge.pushTrigger` 가 매 호출 시 사용

**테스트:** `triggers.test.ts` 에 minQueryLength=1, 2 회귀 (4 단언).

---

## F23 · @p/anyeditable 자체 — `aria-multiline` 기본값 정합 수정 (자체 해결)

**상황:** iter 1 부터 `rootProps['aria-multiline'] = false` 였음. iter 18 에서 Shift+Enter
줄바꿈(`insertLineBreak`/`insertParagraph`) 추가했지만 ARIA 어휘 갱신을 누락 — **WAI-ARIA 와
실제 동작 불일치 (a11y 회귀)**. 스크린리더가 single-line input 으로 안내하지만 줄바꿈 가능.

**iter 25 조치:**
- 기본값 `aria-multiline: true` 로 변경 — 사실과 정합
- 옵션 `multiline?: boolean` 추가 — single-line composer (예: search bar) 위해 false 명시 가능
- 테스트: rootProps 의 `aria-multiline` / `role` 어휘 회귀 박제

**교훈 (가족 invariant):** 표준 어휘 SSOT 채택 (I2) 가족에서도 행동·속성 동기 누락 가능. 새 inputType 분기
추가 시 ARIA 어휘 동시 점검 체크리스트가 필요.

---

## F24 · `apps/composer-demo` — Vite real-browser smoke (자체 해결)

**iter 26 조치:** monorepo 에 `apps/composer-demo` 워크스페이스 추가.
- React 19 + Vite 6 + 가족 3 패키지 (@p/anyeditable, @p/aria-kernel, zod-crud)
- 단일 `App.tsx` (78줄) 가 모든 v0.3 표면 사용 — `@`/`/` triggers, popover ARIA, 줄바꿈, undo/redo, submit
- CSS chip styling 으로 시각 검증 가능
- `npm run dev` (vite) — 브라우저에서 실제 IME, 모바일, paste, 한글 전체 회귀
- `npm run build` 통과 (vite, 301 KB / gzip 92 KB 전체 — composer kernel 자체는 5.9 KB)

**용도:**
- jsdom 한계 너머 회귀 (실제 브라우저 IME, 모바일, paste-from-Word 등)
- README 의 코드 예제가 실제로 동작하는지의 살아있는 증명
- 향후 Playwright headless 테스트의 타겟

---

## F25 · React reconciliation vs contenteditable text nodes (iter 28, 자체 해결)

**증상:** 한글 IME 조합 중 글자가 "밀리는" 시각 효과 — composition 결과가 React render 와
충돌하여 textNode 가 재생성되며 caret context 가 손실.

**원인:** App.tsx 가 `<span>{b.text}</span>` 로 React 를 textNode 소유자로 만듦. React reconciler 가
모델 변경 시 textNode 를 새로 만들거나 nodeValue 를 덮어쓰며 native composition state 파괴.

**iter 28 조치 (Lexical-concept self DOM reconciler):**
- 호스트는 컨테이너 ref 만 제공 (`<div ref={c.containerRef} />`)
- 패키지가 `useDocReconciler` 로 내부 DOM 소유: text block 은 `textNode.nodeValue` in-place 갱신
- atomic block 은 `createPortal` 로 마운트 (DecoratorNode-equivalent)
- 호스트 API 변경: `rootProps`/`blockProps(i)`/`atomicProps(i)` → `containerRef` + `containerProps` + `portals` + `renderAtomic`

**교훈 (가족 invariant):** "headless = props만 반환" 표면이 contenteditable 시나리오에서는
충분하지 않다. React 의 reconciliation 권한을 DOM 의 일부만 양보하는 게 native IME 와 공존 핵심.

## F26 · React state batching across rapid keystrokes (iter 29, 자체 해결)

**증상:** 동기적으로 빠르게 발생한 beforeinput (`burst dispatch`) 에서 doc 가 역순으로 적용됨
(`helloworld` → `dlrowolleh`). `setState` 가 batched 되어 후속 핸들러가 stale doc 읽음.

**iter 29 조치 (`useSyncDocOps`):**
- user.ops.apply 를 래핑. 매 apply 마다 zod-crud `applyPatch` 로 stateRef.current.doc 을 동기 갱신
- 후속 핸들러는 fresh snapshot 읽음 — React 의 setState 가 lands 하기 전에도 정합
- onBI / compositionend / commitAtomic / useClipboard 의 cut 모두 wrappedOps 로 라우팅

**교훈:** "controlled React state" 가 keyboard event 핸들러의 진실의 원천이 되려면 동기 mirror 필요.
React 18 concurrent batching 이 이 갭을 더 자주 노출.

## F27 · aria-kernel combobox 가 `<input onChange>` 없는 contenteditable 에서 닫힘 (iter 30, 자체 해결)

**증상:** `@bo` 로 첫 chip 커밋 후 `/run` 입력 시 popover 가 보이지만 (`hidden=""` 추가됨), Enter 가
activate 를 발화하지 않음. 두 번째 trigger 에서 combobox state machine 이 `open=false` 상태.

**원인:** combobox 의 `openOnType` 분기는 `<input onChange>` 에서 발화. contenteditable 은 onChange 가 없음.
첫 트리거는 `openOnFocus` 로 열렸으나 activate 후 `{open:false}` 가 fire 되어 닫힌 채로 두 번째 트리거 진입.

**iter 30 조치 (`useTriggerCombobox` hook):**
- App.tsx 가 useEffect 로 c.trigger 의 (kind, blockIdx) 키 transition 감지
- `dispatch({type:'open', id:ROOT, open:true})` + `dispatch({type:'navigate', id:firstItem.id})` 직접 발화
- 첫 트리거에서도 Enter 단독으로 commit 가능 (ArrowDown 불필요)

**aria-kernel 후속 제안:** `useComboboxPattern` 에 "headless input" 옵션 (`controlValue?: string`) 추가하여
contenteditable 등 onChange 없는 컨트롤에서도 typing path 가 자동 발화하도록.

## F28 · 외부 doc shrink (undo/load) 후 stale caret 으로 인한 zod-crud `path_not_found` (iter 31, 자체 해결)

**증상:** chip commit + tail 입력 후 Cmd+Z 여러 번 → 다음 keystroke 마다
`JsonCrudError: useJson failed: path_not_found — op[0]: out of range: 4` 다발성 throw.
`bridgeHandlers.handleBI:39` 에서 ops.apply 가 zod-crud 의 applyPatch 를 거쳐 throw.

**원인:** `refs.caret.current` 는 last interaction 의 blockIdx 를 그대로 들고 있음.
외부 undo (zod-crud `commands.undo`) 가 doc.blocks 를 짧게 만들어도 caret 은 stale.
다음 beforeinput 이 그 stale blockIdx 에 patch 를 생성 → `/blocks/4` 같은 out-of-range path → throw.

**iter 31 조치 (`caretClamp.ts`):**
- `handleBI` / `handleCE` 진입 시 `refs.caret.current = clampCaret(doc, refs.caret.current)` 로 보정
  - `blockIdx → [0, blocks.length-1]`, `offset → [0, block.text.length]` (text) / `[0, 1]` (atomic)
- `clampRange` 로 Selection range 도 동일 보정
- `useSyncDocOps` 가 zodApply 결과 `!ok` 면 `userOps.apply` 를 호출하지 않고 console.warn 으로 강등 (defense-in-depth)
- `commitAtomic` 는 `stateRef.current.doc` (sync mirror) 를 읽고 `trigger.blockIdx` 가 더 이상 존재하지 않으면 noop
- `useClipboard`, `makeSubmit` 의 doc 소스도 sync mirror 로 통일 — rapid type → Enter 가 마지막 글자를 떨어뜨리지 않음

**교훈:** "외부 state 변경 (history, load) + 내부 ref-cached cursor" 가 만나는 모든 경계에서 clamp 필요.
React state mirror 는 항상 한 tick 뒤따라가므로 핫패스의 SSOT 는 sync mirror.

## F29 · No-adjacent-text invariant — uniform enforcement across delete/replace paths (iter 95)

**원칙:** doc.blocks 는 절대 인접한 두 text block 을 가지지 않는다.
(text|chip|text 만 정상, text|text 는 invariant 위반.)

**기존 깨진 경로:**
- deleteRangePatch 단일 atomic 삭제 → text|text 잔존
- deleteRangePatch cross-block (atomic start + 인접 text → text)
- deleteRangePatch cross-block (text start + atomic end + 인접 text)
- rangeReplace 동일 두 패턴
- deleteBackward/Forward atomic-on-caret remove

**iter 95 조치 (`removeAtomicMergingFlanks` 헬퍼 + fold-prev/fold-next):**
- 모든 atomic 삭제 경로가 flanking text 가 둘 다 있으면 merge → 1 text block
- cross-block 의 fold-prev: startB=atomic + prev=text → 모든 patch 를 prev 로 흡수
- cross-block 의 fold-next: endB=atomic + next=text → trailing text 를 merged 에 fold
- deleteBackward/Forward 가 prev/next=text 인 transient 상황에서 한 글자만 삭제 (whole block 삭제 X)

**clampCaret 보완:** atomic-block caret 을 인접 text block edge 로 normalize.
clampRange 는 normalize 안함 (chip-only selection 유지) — invariant 보존 책임은 patch 함수에.

**교훈:** invariant 를 "데이터 구조 + 모든 mutation 경로" 양쪽에서 enforce. 한 군데라도 빠지면 transient state 가 다음 op 의 입력이 되어 visible bug 가 노출됨.
