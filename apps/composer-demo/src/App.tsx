import { useMemo, useState, type KeyboardEvent } from 'react'
import { useJsonDocument } from 'zod-crud'
import {
  ComposerDoc, EMPTY_DOC, useEditableComposer,
  type JsonOps,
} from 'editable-lifecycle'
import { useTriggerCombobox } from './useTriggerCombobox.js'

const USERS = [
  { id: 'u1', label: 'Bob', name: 'bob' },
  { id: 'u2', label: 'Alice', name: 'alice' },
  { id: 'u3', label: 'Charlie', name: 'charlie' },
  { id: 'u4', label: 'Dave', name: 'dave' },
]
const COMMANDS = [
  { id: 'run', label: 'Run last task', name: 'run' },
  { id: 'help', label: 'Show help', name: 'help' },
  { id: 'undo', label: 'Undo last commit', name: 'undo' },
]

export function App() {
  const [submitted, setSubmitted] = useState<unknown>(null)
  const jd = useJsonDocument(
    ComposerDoc as unknown as Parameters<typeof useJsonDocument>[0],
    EMPTY_DOC, { history: 50 },
  )
  const doc = jd.value as typeof EMPTY_DOC
  const ops: JsonOps = { apply: (patches) => { jd.ops.patch(patches) } }

  const c = useEditableComposer({
    doc, ops,
    triggers: { '@': 'mention', '/': 'command' },
    placeholder: 'Type a message — try @ or /',
    autoFocus: true,
    spellCheck: true,
    maxLength: 500,
    renderAtomic: (b) => b.kind === 'mention'
      ? <span className="chip">@{b.label}</span>
      : b.kind === 'command'
      ? <span className="chip">/{b.name}</span>
      : null,
    onSubmit: ({ doc: d, text }) => { setSubmitted({ doc: d, text }); jd.ops.load(EMPTY_DOC) },
    onUndo: () => { jd.commands.undo() },
    onRedo: () => { jd.commands.redo() },
  })

  const items = useMemo(() => {
    if (!c.trigger) return []
    const pool = c.trigger.kind === 'mention' ? USERS : COMMANDS
    return pool.filter(it => it.name.startsWith(c.trigger!.query))
  }, [c.trigger])

  const cb = useTriggerCombobox(c.trigger, items, (it) => {
    c.commitAtomic(c.trigger!.kind === 'mention'
      ? { kind: 'mention', id: it.id, label: it.name }
      : { kind: 'command', name: it.name })
  })

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!c.trigger) return
    if (e.key === 'Escape') { e.preventDefault(); c.cancelTrigger(); return }
    if (/^(Arrow|Enter|Home|End)/.test(e.key)) cb.comboboxProps.onKeyDown?.(e)
  }

  return (
    <>
      <div
        className="composer"
        ref={c.containerRef}
        {...c.containerProps}
        onKeyDown={(e) => { onKeyDown(e); c.containerProps.onKeyDown?.(e) }}
      />
      {c.portals}
      {c.trigger && items.length > 0 && (
        <ul className="popover" {...cb.listboxProps} hidden={false}>
          {items.map(it => (
            <li key={it.id} {...cb.optionProps(it.id)}>{String(it.label ?? it.id)}</li>
          ))}
        </ul>
      )}
      <p className="hint">@-mention · /-command · Shift+Enter linebreak · Cmd+Z/Cmd+Shift+Z undo/redo · Enter submit</p>
      {submitted !== null && <pre className="submitted">{JSON.stringify(submitted, null, 2)}</pre>}
    </>
  )
}
