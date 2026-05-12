import { useMemo, useState, type HTMLAttributes, type KeyboardEvent, type LiHTMLAttributes, type ReactNode } from 'react'
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

const API_GROUPS = [
  {
    title: '주요 hook',
    rows: [
      ['useEditable', 'input, textarea, select 기반 inline edit lifecycle'],
      ['useEditableComposer', 'contenteditable 기반 composer lifecycle'],
    ],
  },
  {
    title: 'composer toolkit',
    rows: [
      ['ComposerDoc / EMPTY_DOC', 'composer document schema와 초기값'],
      ['useEphemeralCollection', 'trigger suggestion list를 combobox data로 어댑트'],
      ['serialize / serializeRange', 'submit, clipboard용 plain text projection'],
      ['resolveCaret / resolveRange', 'DOM Selection을 document position으로 변환'],
    ],
  },
]

export function App() {
  return (
    <main className="doc">
      <header className="doc-header">
        <p className="kicker">기술 노트 / playground</p>
        <h1>@p/anyeditable</h1>
        <p>
          React에서 직접 만든 편집 UI에 붙이는 headless editing lifecycle hook입니다.
          아직 범용 editor framework가 아니라, 현재는 두 가지 편집 surface를 안정적으로 다루는 패키지입니다.
        </p>
        <pre className="install"><code>npm i @p/anyeditable</code></pre>
      </header>

      <NotebookSection id="scope" title="0. 현재 제공하는 것">
        <p>
          이 패키지의 중심은 컴포넌트가 아니라 lifecycle입니다. UI, markup, CSS, design token은 앱이 소유하고,
          패키지는 편집 시작, draft, commit, cancel, selection, paste, IME 같은 브라우저 편집 흐름을 맡습니다.
        </p>
        <div className="api-groups">
          {API_GROUPS.map(group => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              <dl>
                {group.rows.map(([name, desc]) => (
                  <div key={name}>
                    <dt><code>{name}</code></dt>
                    <dd>{desc}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </NotebookSection>

      <NotebookSection id="inline-edit" title="1. 기본형: inline edit">
        <p>
          가장 작은 사용 형태입니다. 셀을 더블클릭하거나, 셀을 선택한 뒤 바로 타이핑하면 edit mode로 들어갑니다.
          Enter/Tab은 commit과 이동, Escape는 cancel, blur는 commit입니다.
        </p>
        <InlinePlayground />
      </NotebookSection>

      <NotebookSection id="composer" title="2. 확장형: contenteditable composer">
        <p>
          contenteditable로 넘어가면 IME, selection, paste, atomic chip 같은 문제가 생깁니다.
          `useEditableComposer`는 이 영역을 flat `ComposerDoc`과 patch 흐름으로 다룹니다.
        </p>
        <ComposerPlayground />
      </NotebookSection>

      <NotebookSection id="internals" title="3. 내부 흐름">
        <p>현재 composer의 핵심 흐름은 아래 정도로만 이해하면 됩니다. 파일 구조 설명은 이 흐름 뒤에 붙는 보조 정보입니다.</p>
        <ol className="flow">
          <li><strong>Input Events</strong><span>beforeinput, compositionend가 native edit intent를 만든다.</span></li>
          <li><strong>Selection API</strong><span>DOM caret/range를 document position으로 바꾼다.</span></li>
          <li><strong>RFC 6902 patches</strong><span>insert/delete/range/atomic 조작을 patch로 표현한다.</span></li>
          <li><strong>DOM reconcile</strong><span>model을 contenteditable DOM에 되돌리고 caret을 복원한다.</span></li>
        </ol>
      </NotebookSection>

      <NotebookSection id="tests" title="4. 테스트 계약">
        <p>
          현재 demo는 문서이면서 browser smoke surface입니다. composer 계약은 기존 e2e가 계속 검증합니다.
        </p>
        <ul>
          <li>unit/integration: 186 tests</li>
          <li>browser e2e: 70 scenarios</li>
          <li>커버 범위: IME, paste, selection, atomic chip, undo/redo, submit</li>
        </ul>
      </NotebookSection>
    </main>
  )
}

function NotebookSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="notebook-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function InlinePlayground() {
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
    <div className="example">
      <div className="playground">
        <h3>Playground</h3>
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
      </div>
      <div className="observe">
        <h3>Observe</h3>
        <pre>{JSON.stringify({ focusId: ed.focusId, editing: ed.editing, draft: ed.draft, values }, null, 2)}</pre>
      </div>
      <CodeBlock code={INLINE_SNIPPET} />
    </div>
  )
}

function ComposerPlayground() {
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
    <div className="example">
      <div className="playground">
        <h3>Playground</h3>
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
        <h3>Observe</h3>
        <pre>{JSON.stringify({ doc, text: serialize(doc), trigger: c.trigger, submitted }, null, 2)}</pre>
        <pre className="submitted">{submitted !== null ? JSON.stringify(submitted, null, 2) : '(press Enter)'}</pre>
      </div>
      <CodeBlock code={COMPOSER_SNIPPET} />
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="code-cell">
      <h3>Code</h3>
      <pre><code>{code}</code></pre>
    </div>
  )
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
