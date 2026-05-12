export { useEditable } from './useEditable.js'
export type { UseEditableOptions, InputProps, SelectProps, NavDir, CaretMode } from './editableTypes.js'

export {
  ComposerDoc,
  Block,
  TextBlock,
  MentionBlock,
  CommandBlock,
  EMPTY_DOC,
} from './composer/schema.js'
export type { AtomicKind } from './composer/schema.js'
export { useEditableSurface } from './composer/useEditableSurface.js'
export { useEditableComposer } from './composer/useEditableComposer.js'
export { useEphemeralCollection } from './composer/useEphemeralCollection.js'
export { resolveCaret, resolveNodeOffset } from './composer/resolveCaret.js'
export type { DocPos } from './composer/resolveCaret.js'
export { resolveRange } from './composer/resolveRange.js'
export type { DocRange } from './composer/resolveRange.js'
export { serialize, serializeBlock, serializeRange } from './composer/serialize.js'
export type { Patch } from './composer/blockOps.js'
export type {
  UseEditableSurfaceOptions,
  UseEditableSurfaceReturn,
  TriggerState,
  JsonOps,
} from './composer/useEditableSurface.js'
export type {
  UseEditableComposerOptions,
  UseEditableComposerReturn,
} from './composer/useEditableComposer.js'
