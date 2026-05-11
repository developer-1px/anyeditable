import { useEditable } from '../src/useEditable.js'

export interface HarnessProps {
  values: Record<string, string>
  onCommit: (id: string, v: string) => void
  onNavigate?: (id: string, dir: 'down' | 'up' | 'left' | 'right') => string | null
}

export function Harness(props: HarnessProps) {
  const ed = useEditable<string>({
    getValue: (id) => props.values[id] ?? '',
    onCommit: props.onCommit,
    onNavigate: props.onNavigate,
    initialFocus: 'a',
  })
  return (
    <div
      data-testid="root"
      tabIndex={0}
      onKeyDown={(e) => ed.focusId && ed.handleTypeToEdit(e, ed.focusId)}
    >
      <span data-testid="state">{ed.editing ?? 'idle'}</span>
      <span data-testid="focus">{ed.focusId ?? 'none'}</span>
      <button onClick={() => ed.startEdit('a')}>start</button>
      <button onClick={() => ed.cancelEdit()}>cancel</button>
      <button onClick={() => ed.commitEdit()}>commit</button>
      <button onClick={() => ed.startEdit('a', undefined, { caret: 'select-all' })}>start-selectall</button>
      <button onClick={() => ed.startEdit('a', undefined, { caret: 'start' })}>start-start</button>
      {ed.editing && <input data-testid="input" {...ed.inputProps} />}
    </div>
  )
}
