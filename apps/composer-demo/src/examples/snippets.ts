export const CELL_INLINE_EDIT_SNIPPET = `const ed = useEditable({
  getValue: id => values[id],
  onCommit: (id, next) => save(id, next),
  onNavigate: (id, dir) => nextCell(id, dir),
})

return ed.editing === id
  ? <input {...ed.inputProps} />
  : <button onDoubleClick={() => ed.startEdit(id)}>
      {values[id]}
    </button>`

export const VISUAL_CONTENTEDITABLE_SNIPPET = `const titleDoc = useJsonDocument(
  ComposerDoc,
  { blocks: [{ kind: 'text', text: '캠페인 런칭' }] },
)

const title = useEditableSurface({
  doc: titleDoc.value,
  ops: { apply: patches => titleDoc.ops.patch(patches) },
  triggers: {},
  multiline: false,
  label: 'title',
})

return (
  <h3
    className="visual-field title"
    ref={title.containerRef}
    {...title.containerProps}
  />
)`

export const COMPOSER_SNIPPET = `const c = useEditableSurface({
  doc,
  ops: { apply: patches => jd.ops.patch(patches) },
  triggers: { '@': 'mention', '/': 'command' },
  renderAtomic: block => <Chip block={block} />,
  onSubmit: ({ doc, text }) => send(doc, text),
})

if (c.trigger) {
  c.commitAtomic({ kind: 'mention', id, label })
}`
