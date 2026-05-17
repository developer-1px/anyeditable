# PRD: IME-safe Block Document Surface

Status: needs-triage
Date: 2026-05-15
Package scope: @interactive-os/anyeditable
Related package scopes: @interactive-os/keyboard, @interactive-os/document, @interactive-os/editor

## Problem Statement

Users need `@interactive-os/anyeditable` to provide a headless block document editing surface that can become the browser editing kernel for `@interactive-os/editor`. The current prototype can render block DOM and produce JSONPatchOperation-compatible operations, but it is not IME-safe for Korean/CJK input.

The failure mode is not a shortcut problem. It is a DOM ownership problem. During IME composition, the browser owns an active composition text passage inside the `contenteditable` DOM. If React, a reconciler, mark decoration, selection restore, or block re-render touches that active subtree before the browser has completed its composition transaction, Korean/CJK preedit text and caret state can break.

The current package documentation also states that multi-block document trees and inline marks are out of scope for `@interactive-os/anyeditable`. This PRD therefore requires an explicit scope decision: either the block document surface remains experimental inside `anyeditable`, or the package scope is expanded from composer surfaces to browser editing physics for block document surfaces.

## Solution

Build a composition-aware document surface kernel that treats IME composition as a first-class transaction. General non-IME editing continues to use `beforeinput` with cancelable native edits converted into JSONPatchOperation-compatible operations. IME composition is different: native DOM mutation is allowed temporarily, reconciliation is frozen for the active editing subtree, and the final committed DOM/input result is converted into operations only after the browser has completed or exposed the composition result.

The user-facing outcome is simple: typing Korean text such as `한글 테스트` into the block document surface must not duplicate text, drop text, reorder jamo, move the caret, or lose marks/blocks outside the active composition block.

## User Stories

1. As a Korean user, I want to type Hangul syllables into a paragraph block, so that the editor accepts normal Korean text without broken jamo or duplicate commits.
2. As a Korean user, I want to type Hangul inside a heading block, so that block type does not change IME behavior.
3. As a CJK user, I want the editor to leave my active composition text alone, so that the IME candidate/preedit UI remains stable.
4. As a document editor user, I want the caret to stay where the IME places it, so that composition feels native.
5. As a document editor user, I want composition to work inside marked text, so that bold or highlighted regions do not break typing.
6. As a document editor user, I want composition at the beginning of a block to work, so that empty paragraphs and headings are usable.
7. As a document editor user, I want composition at the end of a block to work, so that normal append typing is safe.
8. As a document editor user, I want composition in the middle of text to replace the intended range, so that insertion and replacement behavior matches native editing.
9. As a document editor user, I want composition after block split or merge to remain stable, so that Enter and Backspace do not poison the next IME session.
10. As a document editor user, I want non-IME typing to remain patch-only, so that editor state remains deterministic.
11. As a host app developer, I want document model adapters to remain host-provided, so that `anyeditable` does not own application schema.
12. As a host app developer, I want emitted operations to stay compatible with JSONPatchOperation, so that existing `zod-crud` integration remains viable.
13. As a host app developer, I want React to own only the container ref and decorator portals, so that React render does not compete with native editing DOM.
14. As a host app developer, I want active composition transactions to expose debug state, so that IME failures can be diagnosed without guessing.
15. As a package maintainer, I want IME state to be represented explicitly, so that future fixes are state-machine changes instead of scattered flags.
16. As a package maintainer, I want the active block subtree frozen during composition, so that unrelated renders do not destroy the browser composition context.
17. As a package maintainer, I want external block updates queued during composition, so that host state changes do not mutate the active editing subtree mid-composition.
18. As a package maintainer, I want selection restore disabled during composition, so that the browser's IME selection remains authoritative.
19. As a package maintainer, I want mark decoration rendering suspended in the active block during composition, so that decoration wrappers do not split or replace active text nodes.
20. As a package maintainer, I want a DOM diff path after native input, so that non-cancelable browser edits can still become model operations.
21. As a package maintainer, I want a trace harness for composition events, so that browser/OS event ordering can be captured and replayed.
22. As a package maintainer, I want Playwright tests for synthetic event order variants, so that known edge cases do not regress.
23. As a package maintainer, I want manual QA criteria for trusted OS IME input, so that limitations of synthetic browser tests are explicit.
24. As an `@interactive-os/editor` integrator, I want the block surface to be headless, so that editor UI can stay outside `anyeditable`.
25. As an `@interactive-os/editor` integrator, I want no toolbar or styling in this kernel, so that product-level editor composition remains separate.
26. As an `@interactive-os/keyboard` maintainer, I want shortcut IME gating to stay in `keyboard`, so that keyboard identity does not absorb DOM reconciliation responsibilities.
27. As an `@interactive-os/document` maintainer, I want document schema and preview document concerns to remain separate, so that editable DOM physics does not leak into SSOT document modeling.
28. As a QA engineer, I want acceptance tests to assert both DOM and state, so that duplicate and missing text failures are caught.
29. As a QA engineer, I want tests to assert that active composition block DOM is not reconciled, so that the real bug class is covered.
30. As a user of existing `useEditableSurface`, I want no behavior regression, so that composer/inline flat block workflows remain stable.

## Implementation Decisions

- Treat IME composition as a separate editing mode, not as normal `insertText`.
- Add a composition transaction model with start range, active block identity, pre-composition DOM snapshot, latest native DOM snapshot, pending committed text, and transaction status.
- Use `compositionstart`, `compositionupdate`, `beforeinput`, `input`, and `compositionend` together. Do not rely only on `compositionend.data`.
- Respect Input Events behavior: `insertCompositionText` is part of IME composition and must not be treated as a cancelable patch-only edit.
- During active composition, the active block subtree is frozen. The reconciler must not replace, reorder, rewrap, mark-decorate, or restore selection inside that subtree.
- During active composition, external block updates are queued or applied only to non-active blocks. If an external update targets the active block, it must be deferred until commit or explicitly rejected by policy.
- During active composition, selection mapping may observe but must not force restore. Browser selection is authoritative.
- After composition, derive a model operation from the committed browser result. Preferred input sources, in order: `input` event target ranges and data, active block DOM diff, composition event data.
- The operation output remains JSONPatchOperation-compatible and host-adapter based.
- Non-IME edits continue to use cancelable `beforeinput` with `preventDefault` and operation generation.
- Non-cancelable or missed `beforeinput` edits must be handled by `input` plus DOM revert/diff logic.
- React must not render editable block contents. React may own only the container ref, immutable props, and decorator portals outside the active native text path.
- Inline marks are rendered by the document reconciler only when the block is not composing.
- `@interactive-os/keyboard` remains responsible only for shortcut matching and `isComposing`/IME shortcut gates. It does not own contenteditable DOM policy.
- The block document surface should be exported as experimental until trusted OS IME manual QA passes.
- Current package docs that mark multi-block document trees and inline marks as out of scope must be reconciled before stable release. This is either a deliberate package scope expansion or a reason to move the block surface behind `@interactive-os/editor`.

## Testing Decisions

- Automated tests must assert external behavior: text in document state, text in DOM, caret/selection position when observable, and absence of duplicate commits.
- Unit tests should cover the composition transaction state machine without relying on React rendering internals.
- Unit tests should cover operation generation from committed native DOM diffs.
- Unit tests should cover composition event ordering variants: final text in `compositionend.data`, final `insertText`, final `insertCompositionText`, empty `compositionend.data`, and missing final `beforeinput`.
- Unit tests should cover the active block freeze policy by asserting that reconciliation does not touch active block text/children/marks during composition.
- Integration tests should use the existing document surface harness and verify paragraph, heading, bold mark, Enter split, Backspace merge, paste, and Korean composition.
- Playwright tests should remain for synthetic event order variants, but they are not sufficient as the only proof of IME safety because trusted OS IME behavior cannot be fully synthesized.
- Add a trace/debug harness that records event type, inputType, data, isComposing, target ranges, current selection, active block text, and model text for manual IME sessions.
- Manual QA must include macOS Korean 2-set input in Chromium and Safari. Windows Korean IME and Android Korean keyboard should be added before stable release.
- A good regression test should fail if active composition text is duplicated, dropped, reordered, or if a reconciler replaces the active text node while composing.
- Existing `useEditable` and `useEditableSurface` tests must remain part of full verification to protect current package behavior.

## Acceptance Criteria

- Typing `한글 테스트` into an empty paragraph produces exactly `한글 테스트` in state and DOM.
- Typing `한글 테스트` into a heading produces exactly `한글 테스트` in state and DOM.
- Typing Korean in the middle of existing ASCII text inserts at the intended caret position.
- Typing Korean inside a bold-marked range does not remove or duplicate adjacent marked text.
- During composition, active block DOM children are not replaced by the reconciler.
- During composition, selection restore is not called for the active block.
- During composition, mark decoration rerender is skipped for the active block.
- Composition commit emits a single operation sequence.
- A post-composition native final input event does not duplicate the committed text.
- If `compositionend.data` is empty, the committed text is recovered from the final input event or DOM diff.
- Non-IME paragraph input still uses cancelable `beforeinput` and patch operations.
- Enter split, Backspace merge, Delete merge, and plain-text paste continue to pass.
- Existing `useEditableSurface` composer tests continue to pass.
- The feature is not marked stable until trusted OS IME manual QA passes.

## Out of Scope

- Toolbar, bubble menu, slash command UI, block menu UI, and styling.
- Full Markdown parser and HTML paste.
- Collaborative editing, OT, CRDT, multiplayer cursors, and remote selection merging.
- Editor product commands such as backlinks, embeds, wiki graph, file persistence, and plugin API.
- Owning the host document schema inside `anyeditable`.
- Moving shortcut identity or keyboard normalization into this feature; that remains `@interactive-os/keyboard`.
- Claiming complete IME safety based only on synthetic Playwright events.

## Further Notes

External references establish the main technical constraint:

- W3C Input Events Level 2 says IME composition updates dispatch `beforeinput` and `input` pairs for `insertCompositionText`, those events are not cancelable, and the DOM active composition passage is updated between them: https://w3c.github.io/input-events/
- MDN documents that `beforeinput` may be non-cancelable for IME and that code may need to handle `input` and revert or reconcile unhandled modifications: https://developer.mozilla.org/en-US/docs/Web/API/Element/beforeinput_event
- MDN defines `compositionstart` and `compositionend` as lifecycle events for IME composition sessions: https://developer.mozilla.org/en-US/docs/Web/API/Element/compositionstart_event and https://developer.mozilla.org/en-US/docs/Web/API/Element/compositionend_event
- React's long-running controlled component IME issue documents that event ordering varies across browsers and OSes and that controlled rendering makes IME handling hard: https://github.com/facebook/react/issues/8683
- ProseMirror exposes an explicit `EditorView.composing` state and warns against directly interfering with editor DOM, which supports treating composition as a first-class view state: https://prosemirror.net/docs/ref/

The technical direction is therefore not "delay render a little more". The required design is a composition transaction boundary where native DOM is temporarily authoritative for the active composition text, and document state becomes authoritative again only after commit.
