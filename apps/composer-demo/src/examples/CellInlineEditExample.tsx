import { useState } from 'react'
import { useEditable, type NavDir } from '@interactive-os/anyeditable'
import { CodeBlock } from '../docs/CodeBlock.js'
import { CELL_INLINE_EDIT_SNIPPET } from './snippets.js'

const CELL_IDS = ['A1', 'B1', 'C1', 'A2', 'B2', 'C2'] as const
type CellId = typeof CELL_IDS[number]

export function CellInlineEditExample() {
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
        <h3>실행: cell edit</h3>
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
        <h3>관찰</h3>
        <pre>{JSON.stringify({ focusId: ed.focusId, editing: ed.editing, draft: ed.draft, values }, null, 2)}</pre>
      </div>
      <CodeBlock code={CELL_INLINE_EDIT_SNIPPET} />
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
