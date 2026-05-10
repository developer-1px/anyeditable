import { useState } from 'react'
import { applyPatch as zodApply } from 'zod-crud'
import { useEditableComposer, type JsonOps } from '../useEditableComposer.js'
import { ComposerDoc, EMPTY_DOC } from '../schema.js'
import type { Patch } from '../blockOps.js'

function makeOps(getDoc: () => typeof EMPTY_DOC, setDoc: (d: typeof EMPTY_DOC) => void): JsonOps {
  return {
    apply: (patches) => {
      const r = zodApply(ComposerDoc as unknown as Parameters<typeof zodApply>[0], getDoc(), patches as Patch[])
      if (r.result.ok) setDoc(r.state as typeof EMPTY_DOC)
    },
  }
}

export function Harness({ onTriggerChange }: { onTriggerChange?: (t: unknown) => void }) {
  const [doc, setDoc] = useState(EMPTY_DOC)
  const c = useEditableComposer({
    doc,
    ops: makeOps(() => doc, setDoc),
    triggers: { '@': 'mention', '/': 'command' },
  })
  if (onTriggerChange) onTriggerChange(c.trigger)
  return (
    <div data-testid="root" {...c.rootProps}>
      {doc.blocks.map((b, i) =>
        b.kind === 'text'
          ? <span key={i} {...c.blockProps(i)}>{b.text}</span>
          : <span key={i} {...c.blockProps(i)} {...c.atomicProps(i)}>{b.kind === 'mention' ? b.label : '/' + b.name}</span>
      )}
    </div>
  )
}

export { makeOps }
