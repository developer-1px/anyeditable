# composer-demo

Real-browser smoke for `@p/anyeditable` v0.3 chat composer.
Exercises the whole 3-package family (`@p/anyeditable` + `@p/aria-kernel` + `zod-crud`)
in a single `App.tsx`.

## Run

From repo root:

```sh
npm run dev   # vite dev server at http://localhost:5173
```

Or from this folder:

```sh
npm run dev
npm run build       # vite build
npm run typecheck   # tsc --noEmit
```

## What to try (manual smoke)

| Action | Expect |
|---|---|
| Type `@b` | popover with Bob filtered |
| ↑↓ + Enter | mention chip inserted, popover closes |
| Click an option | same |
| `/r` | command popover (Run last task) |
| Type then **Shift+Enter** | linebreak (multiline composer) |
| Type Korean (한국어 IME) | composes correctly via compositionend |
| Drag-select + type | replace selection |
| Drag-select across chip + Backspace | cross-block delete (chip removed, text merged) |
| **Cmd/Ctrl+Z** / **Cmd/Ctrl+Shift+Z** | undo / redo via zod-crud history |
| Click outside the composer | popover closes after 100ms |
| Press **Enter** | submit — JSON output shown below |
| Paste rich text from Word | plain text only |

## Why this exists

`vitest + jsdom` covers ~95% of the kernel logic but cannot honestly verify:
- real IME composition behavior (Safari/Chrome/Firefox each differ)
- mobile keyboard `beforeinput` event quirks
- paste from real applications (Word/Google Docs/Notion)
- visual chip rendering, focus rings, popover positioning

This demo is the gap. It also serves as the **living example** the README links to.

## Files

```
src/
├── App.tsx     # 78 lines — full composer using public surface only
└── main.tsx    # React 19 root
```

Zero kernel internals are imported — only `@p/anyeditable` public exports + the
two peer packages. If this runs, the dogfooding contract holds.
