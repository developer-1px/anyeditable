export const VISUAL_CONTENTEDITABLE_SNIPPET = `const titleDoc = useJSONDocument(
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
