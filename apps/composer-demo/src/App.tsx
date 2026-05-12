import { useMemo, useState, type HTMLAttributes, type KeyboardEvent, type LiHTMLAttributes } from 'react'
import { useJsonDocument } from 'zod-crud'
import {
  ComposerDoc, EMPTY_DOC, serialize, useEditable, useEditableComposer,
  type JsonOps, type NavDir,
} from '@p/anyeditable'
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

const CELL_IDS = ['A1', 'B1', 'C1', 'A2', 'B2', 'C2'] as const
type CellId = typeof CELL_IDS[number]

const INLINE_SNIPPET = `const ed = useEditable({
  getValue: id => values[id],
  onCommit: (id, next) => save(id, next),
  onNavigate: (id, dir) => nextCell(id, dir),
})

return ed.editing === id
  ? <input {...ed.inputProps} />
  : <button onDoubleClick={() => ed.startEdit(id)}>
      {values[id]}
    </button>`

const COMPOSER_SNIPPET = `const c = useEditableComposer({
  doc,
  ops: { apply: patches => jd.ops.patch(patches) },
  triggers: { '@': 'mention', '/': 'command' },
  renderAtomic: block => <Chip block={block} />,
  onSubmit: ({ doc, text }) => send(doc, text),
})

if (c.trigger) {
  c.commitAtomic({ kind: 'mention', id, label })
}`

const steps = [
  { title: 'Start with one editable value', body: 'Use returned props on your own input and keep the lifecycle outside your design system.' },
  { title: 'Add keyboard flow', body: 'Commit, cancel, type-to-edit, blur, and navigation live in the hook instead of scattered handlers.' },
  { title: 'Move to contenteditable', body: 'Composer mode takes over native editing with Input Events and a flat ComposerDoc model.' },
  { title: 'Layer atomics and popovers', body: 'Mentions, slash commands, chips, clipboard, IME, and selection stay in the same model.' },
]

const apiRows = [
  ['useEditable', 'Input, textarea, and select edit lifecycle'],
  ['useEditableComposer', 'Contenteditable composer with triggers and atomic chips'],
  ['useEphemeralCollection', 'Transient suggestion lists for aria-kernel comboboxes'],
  ['ComposerDoc / EMPTY_DOC', 'Zod schema and initial document shape'],
  ['serialize / serializeRange', 'Plain-text projection for submit and clipboard'],
]

export function App() {
  return (
    <main>
      <Hero />
      <section className="ladder" aria-label="Adoption path">
        {steps.map((step, index) => (
          <article key={step.title}>
            <span>{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </section>
      <InlineShowcase />
      <ComposerShowcase />
      <section className="feature-band" aria-labelledby="edge-title">
        <div className="section-copy">
          <p className="eyebrow">production edges</p>
          <h2 id="edge-title">The cases you stop re-implementing</h2>
          <p>
            The package owns editing lifecycle mechanics. Your app owns rendering, styling, persistence, and product behavior.
          </p>
        </div>
        <div className="edge-grid">
          {['IME composition', 'Range replace', 'Atomic delete', 'Plain-text paste', 'Undo / redo', 'Max length forecast'].map(item => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
      <HowItWorks />
      <ApiSurface />
    </main>
  )
}

function Hero() {
  return (
    <header className="hero">
      <div className="hero-copy">
        <p className="eyebrow">react editable lifecycle</p>
        <h1>Headless editable hooks for the surfaces your app already owns.</h1>
        <p className="lede">
          `@p/anyeditable` gives React apps IME-safe inline editing and a contenteditable chat composer without shipping markup, CSS, or a rich-text editor runtime.
        </p>
        <div className="install-row" aria-label="Install command">
          <code>npm i @p/anyeditable</code>
          <a href="#inline-edit">Start simple</a>
          <a href="#composer">Try composer</a>
        </div>
      </div>
      <div className="hero-panel" aria-label="Package summary">
        <div>
          <strong>2 hooks</strong>
          <span>one lifecycle identity</span>
        </div>
        <div>
          <strong>186</strong>
          <span>unit and integration tests</span>
        </div>
        <div>
          <strong>70</strong>
          <span>browser e2e scenarios</span>
        </div>
      </div>
    </header>
  )
}

function InlineShowcase() {
  const [values, setValues] = useState<Record<CellId, string>>({
    A1: 'Roadmap',
    B1: 'In review',
    C1: 'Q2',
    A2: 'Composer',
    B2: 'Ready',
    C2: 'v0.4',
  })

  const ed = useEditable<CellId>({
    getValue: (id) => values[id],
    onCommit: (id, next) => setValues(prev => ({ ...prev, [id]: next })),
    onNavigate: (id, dir) => nextCell(id, dir),
    initialFocus: 'A1',
  })

  return (
    <section id="inline-edit" className="showcase two-col">
      <div className="section-copy">
        <p className="eyebrow">01 / useEditable</p>
        <h2>Start with a cell, field, or select.</h2>
        <p>
          Double-click a value, type directly while a cell is focused, press Enter or Tab to commit, and Escape to cancel.
        </p>
        <ul className="check-list">
          <li>Type-to-edit before an input exists</li>
          <li>IME-safe Enter and Escape handling</li>
          <li>Blur commit and directional navigation</li>
          <li>Adapters for input, textarea, and select</li>
        </ul>
      </div>
      <div className="playground-grid">
        <div
          className="cell-grid"
          onKeyDown={(e) => {
            if (ed.focusId) ed.handleTypeToEdit(e, ed.focusId)
          }}
        >
          {CELL_IDS.map(id => {
            const focused = ed.focusId === id
            return ed.editing === id ? (
              <input key={id} aria-label={id} className="cell-input" {...ed.inputProps} />
            ) : (
              <button
                key={id}
                className={focused ? 'cell active' : 'cell'}
                type="button"
                onClick={() => ed.setFocusId(id)}
                onDoubleClick={() => ed.startEdit(id, undefined, { caret: 'select-all' })}
              >
                <span>{id}</span>
                <strong>{values[id]}</strong>
              </button>
            )
          })}
        </div>
        <CodeBlock code={INLINE_SNIPPET} />
      </div>
    </section>
  )
}

function ComposerShowcase() {
  const [submitted, setSubmitted] = useState<unknown>(null)
  const jd = useJsonDocument(
    ComposerDoc as unknown as Parameters<typeof useJsonDocument>[0],
    EMPTY_DOC, { history: 50 },
  )
  const doc = jd.value as typeof EMPTY_DOC
  const ops = useMemo<JsonOps>(() => ({ apply: (patches) => { jd.ops.patch(patches) } }), [jd.ops])

  const c = useEditableComposer({
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
    <section id="composer" className="showcase composer-showcase">
      <div className="section-copy">
        <p className="eyebrow">02 / useEditableComposer</p>
        <h2>Then move to a real contenteditable composer.</h2>
        <p>
          Type `@b` or `/r`, use arrows and Enter to commit a chip, then press Enter again to inspect the submitted payload.
        </p>
      </div>
      <div className="composer-layout">
        <div className="composer-playground">
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
          <p className="hint">@ mention · / command · Esc cancel · Shift+Enter linebreak · Cmd/Ctrl+Z undo</p>
        </div>
        <div className="inspector">
          <section>
            <h3>ComposerDoc</h3>
            <pre>{JSON.stringify(doc, null, 2)}</pre>
          </section>
          <section>
            <h3>Plain text</h3>
            <pre>{serialize(doc) || '(empty)'}</pre>
          </section>
          <section>
            <h3>Trigger</h3>
            <pre>{c.trigger ? JSON.stringify(c.trigger, null, 2) : '(none)'}</pre>
          </section>
          <section>
            <h3>Submitted</h3>
            <pre className="submitted">{submitted !== null ? JSON.stringify(submitted, null, 2) : '(press Enter)'}</pre>
          </section>
        </div>
        <CodeBlock code={COMPOSER_SNIPPET} />
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="how-it-works" aria-labelledby="how-title">
      <div className="section-copy">
        <p className="eyebrow">under the hood</p>
        <h2 id="how-title">Small public API, standards-shaped internals.</h2>
      </div>
      <ol className="flow">
        {[
          ['Input Events', 'beforeinput and compositionend describe the native edit.'],
          ['Selection API', 'DOM positions resolve to block indexes and offsets.'],
          ['RFC 6902', 'Edits become patch batches consumed by zod-crud.'],
          ['DOM Reconcile', 'Text nodes stay stable; atomics render through portals.'],
        ].map(([title, body]) => (
          <li key={title}>
            <strong>{title}</strong>
            <p>{body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ApiSurface() {
  return (
    <section className="api-section" aria-labelledby="api-title">
      <div className="section-copy">
        <p className="eyebrow">api surface</p>
        <h2 id="api-title">Import only the lifecycle you need.</h2>
      </div>
      <div className="api-table">
        {apiRows.map(([name, desc]) => (
          <div key={name}>
            <code>{name}</code>
            <span>{desc}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function CodeBlock({ code }: { code: string }) {
  return <pre className="code-block"><code>{code}</code></pre>
}

function nextCell(id: CellId, dir: NavDir): CellId | null {
  const idx = CELL_IDS.indexOf(id)
  const col = idx % 3
  const row = Math.floor(idx / 3)
  const next =
    dir === 'right' ? idx + 1
    : dir === 'left' ? idx - 1
    : dir === 'down' ? (row + 1) * 3 + col
    : (row - 1) * 3 + col
  return CELL_IDS[next] ?? null
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
