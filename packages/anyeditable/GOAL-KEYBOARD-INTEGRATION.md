# Keyboard Integration Result

## Goal

Use the stable interactive-os keyboard kernel instead of local ad hoc key checks.

## Changed

- `composerKeys` uses `matches` for undo, redo, submit, and trigger cancellation shortcuts.
- `editableProps` uses `isIMESafe` and `matches` for IME guard and commit navigation keys.
- `useEditable` uses `isPrintable` for type-to-edit.
- `keyboardInput.ts` adapts React `KeyboardEvent` to the `KeyInput` shape without inventing new vocabulary.

## Boundary

`anyeditable` still owns:

- edit lifecycle
- `beforeinput`
- selection and caret recovery
- composer document updates
- React-facing prop contracts

`keyboard` only answers what a key input means.
