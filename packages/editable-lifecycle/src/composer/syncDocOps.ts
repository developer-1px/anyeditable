import { useMemo, type MutableRefObject } from 'react'
import { applyPatch as zodApply } from 'zod-crud'
import { ComposerDoc as ComposerDocSchema, type ComposerDoc } from './schema.js'
import type { Patch } from './blockOps.js'
import type { JsonOps } from './useEditableComposer.js'

export interface DocSnapshotRef {
  current: { doc: ComposerDoc; [k: string]: unknown }
}

/** Wraps user ops so each `apply` advances a synchronous doc snapshot
 *  in `stateRef.current.doc` BEFORE forwarding to the user's async setter.
 *  Without this, rapid keystrokes batched across React renders would read
 *  stale doc and produce out-of-order patches (the `dlrow olleh` bug). */
export function useSyncDocOps(userOps: JsonOps, stateRef: DocSnapshotRef): JsonOps {
  return useMemo<JsonOps>(() => ({
    apply: (patches) => {
      const next = zodApply(
        ComposerDocSchema as unknown as Parameters<typeof zodApply>[0],
        stateRef.current.doc,
        patches as Patch[],
      )
      if (!next.result.ok) {
        // Defense-in-depth: zod-crud rejected — forwarding to user.ops would
        // throw the same error. clampCaret should prevent this upstream;
        // log so the regression surfaces in dev without crashing the app.
        if (typeof console !== 'undefined') console.warn('useSyncDocOps: dropped invalid patch batch', next.result, patches)
        return
      }
      stateRef.current.doc = next.state as ComposerDoc
      userOps.apply(patches)
    },
  }), [userOps, stateRef])
}

export type { MutableRefObject }
