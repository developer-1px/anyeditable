export interface ConceptNode {
  id: string
  title: string
  kind: 'Public API' | 'Kernel' | 'Adapter' | 'Demo' | 'Tests'
  summary: string
  responsibility: string
  files: string[]
  tests: string[]
  inputs: string[]
  outputs: string[]
  exports?: string[]
}

export const principles = [
  'Model is truth',
  'Input Events -> RFC 6902 patches',
  'DOM Selection -> DocPos',
  'Headless props, no design-token ownership',
]

export const lifecycle = [
  { label: 'native event', detail: 'beforeinput, compositionend, selectionchange' },
  { label: 'position', detail: 'Selection -> caret/range, then clamp stale positions' },
  { label: 'intent', detail: 'handleBeforeInput classifies insert/delete/paste' },
  { label: 'patch', detail: 'blockOps/rangeOps emit JsonPatchOperation[]' },
  { label: 'state', detail: 'zod-crud validates and applies ComposerDoc updates' },
  { label: 'dom', detail: 'self reconciler mutates text nodes and portals atomics' },
  { label: 'trigger', detail: 'projected text updates @ and / combobox state' },
]

export const concepts: ConceptNode[] = [
  {
    id: 'public-api',
    title: 'Public API',
    kind: 'Public API',
    summary: 'The package surface exported to consumers.',
    responsibility: 'Keep consumers on stable hooks, schemas, types, resolvers, and serializers without importing internals.',
    files: ['packages/anyeditable/src/index.ts'],
    tests: ['packages/anyeditable/src/composer/__tests__/useEditableComposer.test.tsx'],
    inputs: ['React app imports', 'ComposerDoc schema', 'hook options'],
    outputs: ['useEditable', 'useEditableComposer', 'ComposerDoc', 'resolveCaret', 'serialize'],
    exports: ['useEditable', 'useEditableComposer', 'useEphemeralCollection', 'ComposerDoc', 'EMPTY_DOC'],
  },
  {
    id: 'inline-edit',
    title: 'Inline Edit Kernel',
    kind: 'Kernel',
    summary: 'The v0.2 input, textarea, and select lifecycle hook.',
    responsibility: 'Manage draft state, commit/cancel, keyboard navigation, read-only gates, blur commit, and IME-safe type-to-edit.',
    files: [
      'packages/anyeditable/src/useEditable.ts',
      'packages/anyeditable/src/editableProps.ts',
      'packages/anyeditable/src/editableTypes.ts',
    ],
    tests: [
      'packages/anyeditable/test/useEditable.lifecycle.test.tsx',
      'packages/anyeditable/test/useEditable.props.test.tsx',
      'packages/anyeditable/test/useEditable.ime.test.tsx',
      'packages/anyeditable/test/useEditable.selectProps.test.tsx',
    ],
    inputs: ['KeyboardEvent', 'CompositionEvent', 'getValue(id)', 'onCommit(id, value)'],
    outputs: ['inputProps', 'selectProps', 'editing', 'draft', 'focusId'],
  },
  {
    id: 'composer-schema',
    title: 'Composer Schema',
    kind: 'Kernel',
    summary: 'Flat inline ComposerDoc model validated by zod.',
    responsibility: 'Define the only document shape: text blocks and atomic mention/command blocks.',
    files: ['packages/anyeditable/src/composer/schema.ts'],
    tests: ['packages/anyeditable/src/composer/__tests__/serialize.test.ts'],
    inputs: ['text', 'mention', 'command'],
    outputs: ['ComposerDoc', 'Block', 'EMPTY_DOC', 'AtomicKind'],
    exports: ['ComposerDoc', 'Block', 'TextBlock', 'MentionBlock', 'CommandBlock'],
  },
  {
    id: 'dom-bridge',
    title: 'DOM Bridge',
    kind: 'Kernel',
    summary: 'Native browser events converted into model-level edits.',
    responsibility: 'Listen to contenteditable events, resolve live selection, gate IME composition, enforce read-only and max length, then dispatch patches.',
    files: [
      'packages/anyeditable/src/composer/useDomBridge.ts',
      'packages/anyeditable/src/composer/bridgeHandlers.ts',
      'packages/anyeditable/src/composer/handleBeforeInput.ts',
    ],
    tests: [
      'packages/anyeditable/src/composer/__tests__/useDomBridge.test.tsx',
      'packages/anyeditable/src/composer/__tests__/bridgeHandlers.test.ts',
      'packages/anyeditable/src/composer/__tests__/handleBeforeInput.test.ts',
    ],
    inputs: ['InputEvent', 'CompositionEvent', 'Selection', 'ComposerDoc'],
    outputs: ['Patch[]', 'CaretPos', 'TriggerState'],
  },
  {
    id: 'patch-ops',
    title: 'Patch Operations',
    kind: 'Kernel',
    summary: 'RFC 6902 edit primitives for text, atomics, and ranges.',
    responsibility: 'Generate minimal JsonPatchOperation batches for insert, delete, range replace, chip commit, and flank text merging.',
    files: [
      'packages/anyeditable/src/composer/blockOps.ts',
      'packages/anyeditable/src/composer/rangeOps.ts',
      'packages/anyeditable/src/composer/inputHelpers.ts',
      'packages/anyeditable/src/composer/wordOps.ts',
    ],
    tests: [
      'packages/anyeditable/src/composer/__tests__/blockOps.test.ts',
      'packages/anyeditable/src/composer/__tests__/rangeOps.test.ts',
      'packages/anyeditable/src/composer/__tests__/inputHelpers.test.ts',
      'packages/anyeditable/src/composer/__tests__/wordOps.test.ts',
    ],
    inputs: ['ComposerDoc.blocks', 'caret', 'range', 'inputType', 'insert data'],
    outputs: ['JsonPatchOperation[]', 'next caret'],
  },
  {
    id: 'selection',
    title: 'Selection and Caret',
    kind: 'Kernel',
    summary: 'Selection API positions normalized into document coordinates.',
    responsibility: 'Translate DOM nodes and offsets into block indexes, order ranges, and clamp stale positions after external state changes.',
    files: [
      'packages/anyeditable/src/composer/resolveCaret.ts',
      'packages/anyeditable/src/composer/resolveRange.ts',
      'packages/anyeditable/src/composer/caretClamp.ts',
    ],
    tests: [
      'packages/anyeditable/src/composer/__tests__/resolveCaret.test.tsx',
      'packages/anyeditable/src/composer/__tests__/resolveRange.test.tsx',
      'packages/anyeditable/src/composer/__tests__/caretClamp.test.ts',
    ],
    inputs: ['HTMLElement root', 'Selection', 'Node + offset', 'ComposerDoc'],
    outputs: ['DocPos', 'DocRange', 'clamped CaretPos'],
  },
  {
    id: 'rendering',
    title: 'Self DOM Reconciler',
    kind: 'Kernel',
    summary: 'A contenteditable renderer that keeps React away from text keystrokes.',
    responsibility: 'Mutate text nodes in place, render atomic chips through portals, keep block data attributes current, and restore pending caret positions.',
    files: ['packages/anyeditable/src/composer/useDocReconciler.ts'],
    tests: ['packages/anyeditable/src/composer/__tests__/useDocReconciler.test.tsx'],
    inputs: ['ComposerDoc', 'renderAtomic(block)', 'pendingCaret'],
    outputs: ['DOM spans', 'React portals', 'restored Selection'],
  },
  {
    id: 'triggers',
    title: 'Trigger and Combobox',
    kind: 'Adapter',
    summary: '@ mention and / command state wired to aria-kernel.',
    responsibility: 'Detect trigger queries, suppress dismissed anchors, adapt filtered ephemeral lists, and hand keyboard activation to the combobox pattern.',
    files: [
      'packages/anyeditable/src/composer/triggers.ts',
      'packages/anyeditable/src/composer/projectText.ts',
      'packages/anyeditable/src/composer/useEphemeralCollection.ts',
      'apps/composer-demo/src/useTriggerCombobox.tsx',
    ],
    tests: [
      'packages/anyeditable/src/composer/__tests__/triggers.test.ts',
      'packages/anyeditable/src/composer/__tests__/projectText.test.ts',
      'packages/anyeditable/src/composer/__tests__/useEphemeralCollection.test.tsx',
      'apps/composer-demo/e2e/composer.chips.spec.ts',
    ],
    inputs: ['text projection', 'caret offset', 'filtered items', 'UiEvent'],
    outputs: ['TriggerState', 'NormalizedData', 'combobox props', 'commitAtomic call'],
  },
  {
    id: 'clipboard-serialization',
    title: 'Clipboard and Serialization',
    kind: 'Kernel',
    summary: 'Plain-text projection for copy, cut, and submit.',
    responsibility: 'Serialize atomics back to trigger forms, write clipboard data, and delete cut ranges with the same patch model.',
    files: [
      'packages/anyeditable/src/composer/serialize.ts',
      'packages/anyeditable/src/composer/useClipboard.ts',
    ],
    tests: [
      'packages/anyeditable/src/composer/__tests__/serialize.test.ts',
      'packages/anyeditable/src/composer/__tests__/useClipboard.test.tsx',
      'apps/composer-demo/e2e/composer.clipboard1.spec.ts',
      'apps/composer-demo/e2e/composer.clipboard2.spec.ts',
    ],
    inputs: ['ComposerDoc', 'DocRange', 'ClipboardEvent'],
    outputs: ['plain text', 'clipboardData', 'deleteRangePatch'],
  },
  {
    id: 'demo-contract',
    title: 'Demo and Test Contract',
    kind: 'Demo',
    summary: 'The browser-facing proof that the public API works as composed.',
    responsibility: 'Dogfood anyeditable with zod-crud and aria-kernel while preserving a manual smoke surface and automated e2e contract.',
    files: [
      'apps/composer-demo/src/App.tsx',
      'apps/composer-demo/index.html',
      'apps/composer-demo/playwright.config.ts',
    ],
    tests: [
      'apps/composer-demo/e2e/composer.basic.spec.ts',
      'apps/composer-demo/e2e/composer.boundary.spec.ts',
      'apps/composer-demo/e2e/composer.caret.spec.ts',
      'apps/composer-demo/e2e/composer.submit.spec.ts',
      'apps/composer-demo/e2e/composer.undo.spec.ts',
    ],
    inputs: ['real browser input', 'zod-crud document state', 'aria-kernel combobox events'],
    outputs: ['live composer', 'submitted JSON', '70 e2e scenarios'],
  },
]

export const testContract = [
  { label: 'Unit and integration', value: '186', detail: 'Vitest tests across 27 files' },
  { label: 'Real browser e2e', value: '70', detail: 'Playwright scenarios across 12 specs' },
  { label: 'Primary package', value: '0.4.0', detail: '@p/anyeditable public API' },
]
