# @interactive-os/anyeditable

Headless inline-edit kernels for React.
**Two hooks, one identity** — markup·CSS·design tokens are 0건. Props 만 반환.

| Hook | Use case | Vocabulary closure |
|---|---|---|
| `useEditable` (v0.2) | inline-edit cell · 1-line input/textarea/select with IME-safe lifecycle | WHATWG `composition` events, `KeyboardEvent.isComposing` |
| `useEditableSurface` (v0.3) | contenteditable visual surface or composer — optional `@`-mention, `/`-command, atomic chips | WHATWG Input Events L2, W3C Selection API, RFC 6902, WAI-ARIA APG Combobox |

The v0.3 surface is part of a **3-package family** dogfooded together:

```
@interactive-os/anyeditable ─▶ @interactive-os/aria-kernel  (useComboboxPattern, axes, fromList)
@interactive-os/anyeditable ─▶ zod-crud        (useJsonDocument, JsonPatchOperation)
```

— closed under W3C/IETF/WAI standards. No Lexical / ProseMirror / Slate.

## Install

```bash
npm i @interactive-os/anyeditable
# v0.3 surface additionally requires:
npm i @interactive-os/aria-kernel zod-crud zod
```

## v0.2 — `useEditable` (cell / single-line edit)

```tsx
import { useEditable } from '@interactive-os/anyeditable'

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

## v0.3 — `useEditableSurface` (contenteditable surface)

```tsx
import { useEditableSurface, useEphemeralCollection } from '@interactive-os/anyeditable'
import { useJsonDocument } from 'zod-crud'
import { fromList } from '@interactive-os/aria-kernel'
import { useComboboxPattern } from '@interactive-os/aria-kernel/patterns'
import { ComposerDoc, EMPTY_DOC } from '@interactive-os/anyeditable'

function ChatComposer({ users, onSend }) {
  const jd = useJsonDocument(ComposerDoc, EMPTY_DOC, { history: 50 })
  const ops = { apply: (patches) => jd.ops.patch(patches) }

  const c = useEditableSurface({
    doc: jd.value, ops,
    triggers: { '@': 'mention', '/': 'command' },
    onSubmit: () => { onSend(jd.value); jd.ops.load(EMPTY_DOC) },
    onUndo: () => jd.history.undo(),
    onRedo: () => jd.history.redo(),
  })

  const items = c.trigger ? users.filter(u => u.name.startsWith(c.trigger.query)) : []
  const [data, dispatch] = useEphemeralCollection(items)
  const cb = useComboboxPattern(data, (e) => {
    if (e.type === 'activate') {
      const u = users.find(x => x.id === e.id)
      if (u) c.commitAtomic({ kind: 'mention', id: u.id, label: '@' + u.name })
    } else dispatch(e)
  })

  return (
    <div {...c.rootProps} onKeyDown={(e) => {
      if (c.trigger && /^(Arrow|Enter|Escape)/.test(e.key)) cb.comboboxProps.onKeyDown?.(e)
      c.rootProps.onKeyDown?.(e)
    }}>
      {jd.value.blocks.map((b, i) =>
        b.kind === 'text'
          ? <span key={i} {...c.blockProps(i)}>{b.text}</span>
          : <span key={i} {...c.blockProps(i)} {...c.atomicProps(i)}>
              {b.kind === 'mention' ? b.label : '/' + b.name}
            </span>
      )}
      {c.trigger && (
        <ul {...cb.listboxProps}>
          {cb.items.map(it => <li key={it.id} {...cb.optionProps(it.id)}>{String(it.label)}</li>)}
        </ul>
      )}
    </div>
  )
}
```

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
  server: { deps: { inline: ['@interactive-os/aria-kernel'] } },
  test: { environment: 'jsdom' },
})
```

`@interactive-os/aria-kernel` 설치된 monorepo 의 React 중복 인스턴스 방지.

## Out of scope (intentional)

- Multi-block document tree / inline marks (bold/italic/link) — that's ProseMirror/Lexical territory
- Collaborative editing (OT/CRDT)
- Position mapping through ops (chat scope: re-resolve from DOM after render)
- Rich paste (HTML→schema) — paste is plain-text-forced

Family roadmap: see `DOGFOOD-FINDINGS.md` for the running list of integration findings filed back to `aria-kernel` and `zod-crud`.

## License

MIT
