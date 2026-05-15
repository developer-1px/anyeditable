# Goal Keyboard Integration

## Goal

interactive-os packages should behave like Unix-style core tools: small, stable, composable kernels with narrow ownership.

## Decision

`@interactive-os/keyboard` is the canonical key input kernel for `@interactive-os/anyeditable`.

The integration is intentionally thin:

- `keyboard` owns key descriptors, shortcut matching, printable-key checks, and IME-safe key predicates.
- `anyeditable` owns edit lifecycle, `beforeinput`, DOM Selection, Range, composer document patches, and React prop assembly.
- No listener, focus scope, global hotkey, or framework hook responsibility moves into `keyboard`.

## Result

`anyeditable` now consumes `@interactive-os/keyboard` for `keydown` interpretation while keeping edit intent and document mutation local.

This validates the core-package direction without expanding either package's responsibility.
