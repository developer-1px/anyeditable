# Changelog

## 0.3.0 — Chat composer kernel (dogfood)

3-패키지 가족(@p/aria-kernel + zod-crud + @p/anyeditable) 합성으로 chat composer
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
