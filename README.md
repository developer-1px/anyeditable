# editable-lifecycle

IME-safe inline-edit lifecycle hook for React. The de facto contenteditable replacement.

## Why

`contenteditable` and ad-hoc inline-edit hooks share the same bugs:

- **IME composition is broken**: pressing Enter while typing 한글 commits a half-formed jamo, or Escape during composition cancels the wrong thing
- **Type-to-edit, navigate-after-commit, blur-commit, escape-cancel** are reinvented at every site, slightly wrong each time
- The "happy path" looks easy until you ship to a Korean/Japanese/Chinese user

This hook bakes IME safety in by default and exposes a narrow lifecycle: `start / cancel / commit / draft`.

## Install

```bash
npm i editable-lifecycle
```

## Usage

```tsx
import { useEditable } from 'editable-lifecycle'

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
        ed.editing === id ? (
          <input key={id} {...ed.inputProps} autoFocus />
        ) : (
          <span key={id} onDoubleClick={() => ed.startEdit(id)}>{values[id]}</span>
        ),
      )}
    </div>
  )
}
```

## What you get

- **IME-safe Enter/Escape**: composition is gated via `nativeEvent.isComposing` + `keyCode 229` fallback
- **Type-to-edit**: printable key starts edit pre-filled with the typed character; modifiers and named keys are ignored
- **Navigate-after-commit**: Enter→down, Shift+Enter→up, Tab→right, Shift+Tab→left
  - Alt+Enter → newline (textarea), no commit
  - Cmd/Ctrl+Enter → commit-stay (no navigation)
  - Customizable via `commitKeyMap`
- **Auto-focus + caret control**: hook owns the input ref; caret modes `'end'` | `'start'` | `'select-all'` | `'preserve'`
- **Blur-commit**: focus loss commits without navigation
- **Escape-cancel**: discards draft
- **`<select>` adapter (`selectProps`)**: change-commits-immediately UX for validation dropdowns
- **Read-only gate**: `readOnly: (id) => boolean` blocks `startEdit`

## API

See `packages/editable-lifecycle/src/useEditable.ts`.

## License

MIT
