# Changelog

## 0.3.1 — Lexical-concept self DOM reconciler (한글 IME fix)

### Fixed

- 한글 IME "글자 입력할 때마다 밀리는" 현상 해소 — React reconciler가
  contenteditable 안 텍스트 노드를 직접 mutation하지 못하게 격리. 자체
  `useDocReconciler`가 `nodeValue` in-place 갱신으로 native composition
  context를 보존. 검증: 38개 Playwright e2e 전부 통과 (real Chromium + 실제
  `compositionstart`/`update`/`end` 이벤트 시퀀스 포함).
- `resolveCaret` out-of-bounds — focus가 root past last child일 때 (`selectNodeContents` 등)
  `{blockIdx: lastIdx+1, offset: 0}` 반환하여 range 패치가 존재하지 않는 블록을
  참조하던 문제. 이제 `{lastIdx, endOffset}`으로 매핑.
- `onBI` caret race — handler가 `refs.caret.current` 캐시를 읽어 programmatic
  selection / click-to-position 후 stale. 매 beforeinput에서 live Selection을
  먼저 읽도록 변경.
- Rapid-typing state batching reversal — React `setState` async batching이
  같은 tick에 발생한 여러 beforeinput 핸들러에서 stale doc 읽기를 유발해
  타이핑이 역순으로 적용되던 문제. `useSyncDocOps`가 zod-crud `applyPatch`로
  synchronous doc snapshot을 유지하여 해소. e2e: synchronous 10-burst → "helloworld".
- Mention `@@bob` double-prefix in serialize round-trip — schema 불변식 명문화:
  `MentionBlock.label` / `CommandBlock.name`은 trigger prefix 없이 저장, serialize/render가 prefix 추가.

### Changed — public API (breaking)

- `rootProps` / `blockProps(i)` / `atomicProps(i)` → `containerRef` +
  `containerProps` + `portals` + `renderAtomic` 옵션.
- 호스트는 `<div ref={c.containerRef} {...c.containerProps} />` 한 줄 + `{c.portals}`만.
  패키지가 내부 DOM 소유. (Lexical `<ContentEditable/>` 패턴.)

### Added — internals

- `useDocReconciler` — 블록별 textContent diff + atomic block을 `createPortal`로
  렌더 (DecoratorNode-equivalent).
- `bridgeHandlers` — `handleBI` / `handleCE` 추출 (100줄 규약 준수).
- `useSyncDocOps` — user.ops.apply 래핑하여 zod-crud `applyPatch`로 동기 doc
  snapshot 유지. onBI / compositionend / commitAtomic / cut 모두 라우팅.

### Added — exports

- `resolveNodeOffset(root, node, offset)` — pure DocPos resolver (avoids
  Selection swap that `resolveRange` previously hacked).
- `resolveRange` + `DocRange` type — selection range → doc coordinates.
- `Patch` type alias — RFC 6902 op type for custom JsonOps implementations.

### Demo

- aria-kernel multi-chip activate — `useTriggerCombobox` hook primes the
  listbox (`{open:true}` + `{navigate:first}`) on each trigger transition,
  so Enter alone commits without ArrowDown — first AND subsequent triggers.
- Placeholder via `:has(> :only-child:empty)` CSS selector so prompt
  reappears after delete-all (not only on initial empty doc).
- Command chip yellow theme via `[data-block-kind="command"] .chip` descendant selector.

### Testing

- jsdom contenteditable 단위 테스트 전부 삭제 (jsdom이 IME/Selection을 충실히
  시뮬레이트하지 못함). 48개 Playwright e2e로 대체 — real Chromium에서
  basic input, 한글 composition, click-position, range replace, paste, emoji,
  Shift+Enter linebreak, blur-refocus, cut chip, multi-chip activate 등 검증.

## 0.3.0 — Chat composer kernel (dogfood)

3-패키지 가족(@p/aria-kernel + zod-crud + editable-lifecycle) 합성으로 chat composer
kernel 추가. Lexical/ProseMirror/Slate 미참조, gzip ~4 KB.

### Added — `useEditableComposer`

- contenteditable 위 `@`-mention + `/`-command + atomic chip
- `triggers: { '@': 'mention', '/': 'command' }` — 단어 경계 기반 검출
- `commitAtomic(block)` — text block split + atomic insert (3 patches)
- `onSubmit` (Enter), `onUndo` / `onRedo` (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)
- `rootProps` / `blockProps(i)` / `atomicProps(i)`
- IME composition: 게이트 + compositionend 단발 insertText
- Forward + backward delete across atomics
- W3C Selection ↔ DocPos via `resolveCaret`

### Added — supporting modules

- `useEphemeralCollection` — derived list 를 aria-kernel `useComboboxPattern` 에 어댑트 (issue #135 제안 B 검증)
- `resolveCaret` — pure W3C Selection API → `{ blockIdx, offset }`
- `ComposerDoc` (zod schema) + `EMPTY_DOC` + `Block` discriminated union

### Standards closure

- WHATWG Input Events L2 — `beforeinput` inputType
- W3C Selection API
- WAI-ARIA APG — Editable Combobox With Both List and Inline Autocomplete
- RFC 6901 / 6902 (via zod-crud)

### Dogfood findings filed

- zod-crud#54 — `JsonOps.apply()` throwing variant
- zod-crud#55 — `applyPatch` strict TS inference
- zod-crud#56 — transaction / coalesce-with-previous for keystroke undo granularity
- aria-kernel#134 — `NormalizedData` builder for ad-hoc lists
- aria-kernel#135 — `useComboboxPattern` ephemeral state plumbing (자체 해결 댓글 포함)

자세한 내용: `DOGFOOD-FINDINGS.md`

### Peer dependencies (v0.3 만)

- `@p/aria-kernel` (file path)
- `zod-crud` ^0.9
- `zod` >=4

### Bundle

- v0.3 composer 모듈 gzip ~4.2 KB (peer 제외)
- v0.2 `useEditable` 변경 없음 — 기존 사용자 영향 없음

## 0.2.0

- Alt+Enter, Cmd+Enter, readOnly gate

## 0.1.x

- 0.1.2 — `selectProps` adapter for `<select>`
- 0.1.1 — auto-focus + caret modes + ref management
- 0.1.0 — initial release
