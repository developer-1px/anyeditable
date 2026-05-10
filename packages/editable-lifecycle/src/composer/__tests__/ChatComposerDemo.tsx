import { useMemo, type KeyboardEvent } from 'react'
import { useJsonDocument } from 'zod-crud'
import type { UiEvent } from '@p/aria-kernel'
import { useComboboxPattern } from '@p/aria-kernel/patterns'
import { useEditableComposer, type JsonOps } from '../useEditableComposer.js'
import { useEphemeralCollection } from '../useEphemeralCollection.js'
import { ComposerDoc, EMPTY_DOC, type Block } from '../schema.js'

export const USERS = [
  { id: 'u1', label: 'Bob', name: 'bob' },
  { id: 'u2', label: 'Alice', name: 'alice' },
  { id: 'u3', label: 'Charlie', name: 'charlie' },
]

export type HistoryRef = { current: ReturnType<typeof useJsonDocument>['history'] | null }

export function ChatComposerDemo({ historyRef, onSubmit }: { historyRef?: HistoryRef; onSubmit?: () => void } = {}) {
  const jd = useJsonDocument(
    ComposerDoc as unknown as Parameters<typeof useJsonDocument>[0],
    EMPTY_DOC,
    { history: 50 },
  )
  if (historyRef) historyRef.current = jd.history
  const doc = jd.value as typeof EMPTY_DOC
  const ops: JsonOps = { apply: (patches) => { jd.ops.patch(patches) } }
  const c = useEditableComposer({
    doc, ops,
    triggers: { '@': 'mention', '/': 'command' },
    onUndo: () => jd.history.undo(),
    onRedo: () => jd.history.redo(),
    ...(onSubmit ? { onSubmit } : {}),
  })
  const items = useMemo(
    () => c.trigger ? USERS.filter(u => u.name.startsWith(c.trigger!.query)) : [],
    [c.trigger],
  )
  const [data, dispatch] = useEphemeralCollection(items)
  const cb = useComboboxPattern(data, (e: UiEvent) => {
    if (e.type === 'activate') {
      const u = USERS.find(x => x.id === e.id)
      if (u) c.commitAtomic({ kind: 'mention', id: u.id, label: '@' + u.name } satisfies Block)
      return
    }
    dispatch(e)
  })
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!c.trigger) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape') {
      cb.comboboxProps.onKeyDown?.(e)
    }
  }
  return (
    <div>
      <div data-testid="root" {...c.rootProps} onKeyDown={(e) => { onKeyDown(e); c.rootProps.onKeyDown?.(e) }}>
        {doc.blocks.map((b, i) =>
          b.kind === 'text'
            ? <span key={i} data-block="text" {...c.blockProps(i)}>{b.text}</span>
            : <span key={i} data-block={b.kind} {...c.blockProps(i)} {...c.atomicProps(i)}>
                {b.kind === 'mention' ? b.label : '/' + b.name}
              </span>
        )}
      </div>
      {c.trigger && (
        <ul data-testid="popover" {...cb.listboxProps}>
          {cb.items.map((it) => (
            <li key={it.id} data-testid={`opt-${it.id}`} {...cb.optionProps(it.id)}>
              {String(it.label ?? it.id)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
