# @interactive-os/anyeditable

Headless React kernel for **contenteditable surfaces — plain text only.**
markup·CSS·design tokens are 0건. Props 만 반환. No marks, no formatting.

| Hook | Use case | Vocabulary closure |
|---|---|---|
| `useEditableSurface` | single-block contenteditable composer — optional `@`-mention, `/`-command, atomic chips | WHATWG Input Events L2, W3C Selection API, RFC 6902, WAI-ARIA APG Combobox |
| `useEditableDocumentSurface` | multi-block contenteditable document — splitBlock, plain-text paste | WHATWG Input Events L2 (`insertParagraph`), W3C Selection API, RFC 6902 |

Part of a **3-package family** dogfooded together:

```
@interactive-os/anyeditable ─▶ @interactive-os/aria-kernel  (useComboboxPattern, axes, fromList)
@interactive-os/anyeditable ─▶ zod-crud        (useJSONDocument, JSONPatchOperation)
```

— closed under W3C/IETF/WAI standards. No Lexical / ProseMirror / Slate.

## Install

```bash
npm i @interactive-os/anyeditable @interactive-os/aria-kernel zod-crud zod
```

## `useEditableSurface` (contenteditable surface)

```tsx
import { useEditableSurface, useEphemeralCollection } from '@interactive-os/anyeditable'
import { useJSONDocument } from 'zod-crud'
import { fromList } from '@interactive-os/aria-kernel'
import { useComboboxPattern } from '@interactive-os/aria-kernel/patterns'
import { ComposerDoc, EMPTY_DOC } from '@interactive-os/anyeditable'

function ChatComposer({ users, onSend }) {
  const jd = useJSONDocument(ComposerDoc, EMPTY_DOC, { history: 50 })
  const ops = { apply: (patches) => jd.ops.patch(patches) }

  const c = useEditableSurface({
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

**Self DOM reconciler.** React only owns the
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
- **Undo/redo** through zod-crud's `useJSONDocument` history
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

- **Inline marks (bold/italic/link/code/highlight)** — that's ProseMirror/Lexical territory
- **Form-element inline-edit (input/textarea/select)** — removed in 0.5; this package is contenteditable-only
- Collaborative editing (OT/CRDT)
- Position mapping through ops (chat scope: re-resolve from DOM after render)
- Rich paste (HTML→schema) — paste is plain-text-forced

Family roadmap: see `DOGFOOD-FINDINGS.md` for the running list of integration findings filed back to `aria-kernel` and `zod-crud`.

## License

MIT
