# @p/anyeditable

Headless inline-edit kernels for React.
**Two hooks, one identity** — markup·CSS·design tokens are 0건. Props 만 반환.

| Hook | Use case | Vocabulary closure |
|---|---|---|
| `useEditable` (v0.2) | inline-edit cell · 1-line input/textarea/select with IME-safe lifecycle | WHATWG `composition` events, `KeyboardEvent.isComposing` |
| `useEditableComposer` (v0.3) | chat composer — contenteditable + `@`-mention + `/`-command + atomic chips | WHATWG Input Events L2, W3C Selection API, RFC 6902, WAI-ARIA APG Combobox |

The v0.3 composer is part of a **3-package family** dogfooded together:

```
@p/anyeditable ─▶ @p/aria-kernel  (useComboboxPattern, axes, fromList)
@p/anyeditable ─▶ zod-crud        (useJsonDocument, JsonPatchOperation)
```

— closed under W3C/IETF/WAI standards. No Lexical / ProseMirror / Slate.

## Install

```bash
npm i @p/anyeditable
# v0.3 composer additionally requires:
npm i @p/aria-kernel zod-crud zod
```

## v0.2 — `useEditable` (cell / single-line edit)

```tsx
import { useEditable } from '@p/anyeditable'

function CellGrid({ values, save }) {
  const ed = useEditable<string>({
    getValue: (id) => values[id] ?? '',
    onCommit: (id, next) => save(id, next),
    onNavigate: (id, dir) => nextCellId(id, dir),
    initialFocus: 'A1',
  })
  return (
    <div onKeyDown={(e) => ed.focusId && ed.handleTypeToEdit(e, ed.focusId)}>
      {cells.map((id) =>
        ed.editing === id
          ? <input key={id} {...ed.inputProps} autoFocus />
          : <span key={id} onDoubleClick={() => ed.startEdit(id)}>{values[id]}</span>
      )}
    </div>
  )
}
```

What you get: IME-safe Enter/Escape · Type-to-edit · Navigate-after-commit · Auto-focus + caret modes · Blur-commit · Escape-cancel · `<select>` adapter · Read-only gate.

## v0.3 — `useEditableComposer` (chat composer)

```tsx
import { useEditableComposer, useEphemeralCollection } from '@p/anyeditable'
import { useJsonDocument } from 'zod-crud'
import { fromList } from '@p/aria-kernel'
import { useComboboxPattern } from '@p/aria-kernel/patterns'
import { ComposerDoc, EMPTY_DOC } from '@p/anyeditable'

function ChatComposer({ users, onSend }) {
  const jd = useJsonDocument(ComposerDoc, EMPTY_DOC, { history: 50 })
  const ops = { apply: (patches) => jd.ops.patch(patches) }

  const c = useEditableComposer({
    doc: jd.value, ops,
    triggers: { '@': 'mention', '/': 'command' },
    renderAtomic: (b) => b.kind === 'mention'
      ? <span className="chip">@{b.label}</span>
      : <span className="chip">/{b.name}</span>,
    onSubmit: () => { onSend(jd.value); jd.ops.load(EMPTY_DOC) },
    onUndo: () => { jd.commands.undo() },
    onRedo: () => { jd.commands.redo() },
  })

  const items = c.trigger ? users.filter(u => u.name.startsWith(c.trigger.query)) : []
  const [data, dispatch] = useEphemeralCollection(items)
  const cb = useComboboxPattern(data, (e) => {
    if (e.type === 'activate') {
      const u = users.find(x => x.id === e.id)
      if (u) c.commitAtomic({ kind: 'mention', id: u.id, label: u.name })
    } else dispatch(e)
  })

  return (
    <>
      <div
        ref={c.containerRef}
        {...c.containerProps}
        onKeyDown={(e) => {
          if (c.trigger && /^(Arrow|Enter|Escape)/.test(e.key)) cb.comboboxProps.onKeyDown?.(e)
          c.containerProps.onKeyDown?.(e)
        }}
      />
      {c.portals}
      {c.trigger && items.length > 0 && (
        <ul {...cb.listboxProps} hidden={false}>
          {items.map(it => <li key={it.id} {...cb.optionProps(it.id)}>{String(it.label)}</li>)}
        </ul>
      )}
    </>
  )
}
```

**v0.3.1 — Lexical-concept self DOM reconciler.** React only owns the
container ref; the package mutates text nodes in-place via `nodeValue`
to preserve native IME composition context. Atomic blocks render via
`createPortal` (DecoratorNode-equivalent) so hosts keep React component
freedom for chips. Fixes Korean (CJK) IME "글자 입력할 때마다 밀리는"
regression and other smoothness bugs. See CHANGELOG.

What you get:
- **`@`/`/` trigger detection** with word-boundary rules (Slack/Discord 사실상 표준)
- **Atomic chip insert** via `commitAtomic({ kind, id, label })` — Backspace 1회 통째 삭제, Arrow 1회 통과
- **IME-safe** — composition gated, compositionend → 단발 insertText
- **Forward + backward delete** across atomics
- **DOM Selection ↔ DocPos** via `resolveCaret` + `data-block-index` SSOT
- **Cmd/Ctrl+Z & Cmd/Ctrl+Shift+Z** keyboard shortcuts
- **Undo/redo** through zod-crud's `useJsonDocument` history
- **gzip ~4 KB** (peer deps 제외)

## Standards closure

Vocabulary is grep-firsted from W3C/WHATWG/WAI specs only:

- WHATWG Input Events Level 2 — `beforeinput`, `inputType` (`insertText`, `insertCompositionText`, `deleteContentBackward`, `deleteContentForward`, `insertFromPaste`)
- W3C Selection API — `selectionchange`, `Range.compareBoundaryPoints`
- WAI-ARIA APG — Editable Combobox With Both List and Inline Autocomplete (`aria-activedescendant`)
- RFC 6901 (JSON Pointer) + RFC 6902 (JSON Patch) via zod-crud

위반은 버그 또는 정책 전환이지 개선이 아니다.

## Vitest setup (peer dedupe)

```ts
// vitest.config.ts
export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
  server: { deps: { inline: ['@p/aria-kernel'] } },
  test: { environment: 'jsdom' },
})
```

`@p/aria-kernel` 설치된 monorepo 의 React 중복 인스턴스 방지.

## Out of scope (intentional)

- Multi-block document tree / inline marks (bold/italic/link) — that's ProseMirror/Lexical territory
- Collaborative editing (OT/CRDT)
- Position mapping through ops (chat scope: re-resolve from DOM after render)
- Rich paste (HTML→schema) — paste is plain-text-forced

Family roadmap: see `DOGFOOD-FINDINGS.md` for the running list of integration findings filed back to `aria-kernel` and `zod-crud`.

## License

MIT
