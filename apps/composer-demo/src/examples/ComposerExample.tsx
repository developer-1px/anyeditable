import { useMemo, useState, type HTMLAttributes, type KeyboardEvent, type LiHTMLAttributes } from 'react'
import { useJsonDocument } from 'zod-crud'
import {
  ComposerDoc, EMPTY_DOC, serialize, useEditableSurface,
  type ComposerDoc as ComposerDocType, type JsonOps,
} from '@p/anyeditable'
import { CodeBlock } from '../docs/CodeBlock.js'
import { useTriggerCombobox } from '../useTriggerCombobox.js'
import { COMPOSER_SNIPPET } from './snippets.js'

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

export function ComposerExample() {
  const [submitted, setSubmitted] = useState<unknown>(null)
  const jd = useJsonDocument(
    ComposerDoc as unknown as Parameters<typeof useJsonDocument>[0],
    EMPTY_DOC, { history: 50 },
  )
  const doc = jd.value as ComposerDocType
  const ops = useMemo<JsonOps>(() => ({ apply: (patches) => { jd.ops.patch(patches) } }), [jd.ops])

  const c = useEditableSurface({
    doc, ops,
    triggers: { '@': 'mention', '/': 'command' },
    placeholder: 'Ask @bob to /run the last task',
    spellCheck: true,
    maxLength: 500,
    renderAtomic: (b) => b.kind === 'mention'
      ? <span className="chip">@{b.label}</span>
      : b.kind === 'command'
      ? <span className="chip command">/{b.name}</span>
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

  const onComposerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!c.trigger && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey && (e.key === 'Home' || e.key === 'End')) {
      e.preventDefault()
      moveCaretToEdge(e.currentTarget, e.key === 'End' ? 'end' : 'start')
      return
    }
    onKeyDown(e)
    c.containerProps.onKeyDown?.(e)
  }

  return (
    <div className="example">
      <div className="playground">
        <h3>실행</h3>
        <div
          className="composer"
          ref={c.containerRef}
          {...c.containerProps}
          onKeyDown={onComposerKeyDown}
        />
        {c.portals}
        {c.trigger && items.length > 0 && (
          <ul className="popover" {...(cb.listboxProps as HTMLAttributes<HTMLUListElement>)} hidden={false}>
            {items.map(it => (
              <li key={it.id} {...(cb.optionProps(it.id) as LiHTMLAttributes<HTMLLIElement>)}>{String(it.label ?? it.id)}</li>
            ))}
          </ul>
        )}
        <p className="hint">@b, /r, Escape, Shift+Enter, Cmd/Ctrl+Z를 시도해보세요.</p>
      </div>
      <div className="observe">
        <h3>관찰</h3>
        <pre>{JSON.stringify({ doc, text: serialize(doc), trigger: c.trigger, submitted }, null, 2)}</pre>
        <pre className="submitted">{submitted !== null ? JSON.stringify(submitted, null, 2) : '(press Enter)'}</pre>
      </div>
      <CodeBlock code={COMPOSER_SNIPPET} />
    </div>
  )
}

function moveCaretToEdge(root: HTMLElement, edge: 'start' | 'end') {
  root.focus()
  const doc = root.ownerDocument
  const sel = doc.getSelection()
  if (!sel) return
  const range = doc.createRange()
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let first: Text | null = null
  let last: Text | null = null
  let node = walker.nextNode()
  while (node) {
    if (!first) first = node as Text
    last = node as Text
    node = walker.nextNode()
  }
  if (edge === 'start' && first) range.setStart(first, 0)
  else if (edge === 'end' && last) range.setStart(last, last.nodeValue?.length ?? 0)
  else range.setStart(root, edge === 'start' ? 0 : root.childNodes.length)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}
