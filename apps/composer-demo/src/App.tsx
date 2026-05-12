import { useMemo, useState, type HTMLAttributes, type KeyboardEvent, type LiHTMLAttributes } from 'react'
import { useJsonDocument } from 'zod-crud'
import {
  ComposerDoc, EMPTY_DOC, useEditableComposer,
  type JsonOps,
} from '@p/anyeditable'
import { concepts, lifecycle, principles, testContract } from './conceptMap.js'
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
  const [selectedId, setSelectedId] = useState(concepts[3]!.id)
  const selected = concepts.find(cn => cn.id === selectedId) ?? concepts[0]!
  const jd = useJsonDocument(
    ComposerDoc as unknown as Parameters<typeof useJsonDocument>[0],
    EMPTY_DOC, { history: 50 },
  )
  const doc = jd.value as typeof EMPTY_DOC
  const ops = useMemo<JsonOps>(() => ({ apply: (patches) => { jd.ops.patch(patches) } }), [jd.ops])

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
    <main className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">source-code map browser</p>
          <h1>@p/anyeditable</h1>
          <p className="lede">
            Headless editable kernels for React, explained from the source files that implement them.
          </p>
        </div>
        <dl className="hero-stats" aria-label="Repository summary">
          {testContract.map(item => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
              <small>{item.detail}</small>
            </div>
          ))}
        </dl>
      </header>

      <section className="principles" aria-label="Core principles">
        {principles.map(item => <span key={item}>{item}</span>)}
      </section>

      <section className="browser-grid" aria-labelledby="concept-map-title">
        <aside className="concept-tree">
          <div className="section-heading">
            <p className="eyebrow">concept map</p>
            <h2 id="concept-map-title">Code as IA</h2>
          </div>
          <div className="tree-list">
            {concepts.map((node, index) => (
              <button
                key={node.id}
                className={node.id === selected.id ? 'tree-node active' : 'tree-node'}
                type="button"
                onClick={() => setSelectedId(node.id)}
              >
                <span className="node-index">{String(index + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{node.title}</strong>
                  <small>{node.kind}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <article className="concept-detail">
          <div className="detail-header">
            <div>
              <p className="eyebrow">{selected.kind}</p>
              <h2>{selected.title}</h2>
            </div>
            <span className="file-count">{selected.files.length} files</span>
          </div>
          <p className="summary">{selected.summary}</p>
          <p className="responsibility">{selected.responsibility}</p>

          <div className="io-grid">
            <InfoList title="Inputs" items={selected.inputs} />
            <InfoList title="Outputs" items={selected.outputs} />
            {selected.exports ? <InfoList title="Exports" items={selected.exports} /> : null}
          </div>

          <div className="source-columns">
            <FileList title="Source files" files={selected.files} />
            <FileList title="Tests" files={selected.tests} />
          </div>
        </article>
      </section>

      <section className="lifecycle-section" aria-labelledby="lifecycle-title">
        <div className="section-heading">
          <p className="eyebrow">composer lifecycle</p>
          <h2 id="lifecycle-title">Native event to reconciled DOM</h2>
        </div>
        <ol className="lifecycle-rail">
          {lifecycle.map((step, index) => (
            <li key={step.label}>
              <span className="step-number">{index + 1}</span>
              <strong>{step.label}</strong>
              <p>{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="atlas-section" aria-labelledby="atlas-title">
        <div className="section-heading">
          <p className="eyebrow">module atlas</p>
          <h2 id="atlas-title">Responsibilities by implementation area</h2>
        </div>
        <div className="atlas-grid">
          {concepts.slice(1, 9).map(node => (
            <button
              key={node.id}
              className="atlas-item"
              type="button"
              onClick={() => setSelectedId(node.id)}
            >
              <span>{node.kind}</span>
              <strong>{node.title}</strong>
              <small>{node.files[0]}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="demo-section" aria-labelledby="demo-title">
        <div className="section-heading">
          <p className="eyebrow">live demo</p>
          <h2 id="demo-title">Public API dogfood surface</h2>
        </div>
        <div className="demo-layout">
          <div className="demo-pane">
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
            <p className="hint">@-mention · /-command · Esc closes popover · Shift+Enter linebreak · Cmd+Z/Cmd+Shift+Z undo/redo · Enter submit</p>
          </div>
          <div className="state-pane">
            <h3>Submitted payload</h3>
            <pre className="submitted">{submitted !== null ? JSON.stringify(submitted, null, 2) : 'Press Enter with text to inspect the ComposerDoc payload.'}</pre>
          </div>
        </div>
      </section>

      <section className="roadmap-section" aria-labelledby="roadmap-title">
        <div className="section-heading">
          <p className="eyebrow">roadmap and findings</p>
          <h2 id="roadmap-title">What remains intentionally external</h2>
        </div>
        <div className="finding-grid">
          <p>Dogfood findings track cross-package seams with zod-crud and aria-kernel.</p>
          <p>The next SSOT step is an extractor that generates this concept map from imports, exports, JSDoc, and test names.</p>
          <p>Out of scope remains rich document trees, inline formatting marks, collaborative editing, and HTML paste sanitizing.</p>
        </div>
      </section>
    </main>
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

function InfoList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <section className="info-list">
      <h3>{title}</h3>
      <ul>
        {items.map(item => <li key={item}>{item}</li>)}
      </ul>
    </section>
  )
}

function FileList({ title, files }: { title: string; files: readonly string[] }) {
  return (
    <section className="file-list">
      <h3>{title}</h3>
      <ul>
        {files.map(file => <li key={file}><code>{file}</code></li>)}
      </ul>
    </section>
  )
}
