import { useMemo } from 'react'
import { useJsonDocument } from 'zod-crud'
import {
  ComposerDoc, EMPTY_DOC, serialize, useEditableComposer,
  type ComposerDoc as ComposerDocType, type JsonOps,
} from '@p/anyeditable'
import { CodeBlock } from '../docs/CodeBlock.js'
import { VISUAL_CONTENTEDITABLE_SNIPPET } from './snippets.js'

export function VisualContenteditableExample() {
  const status = useVisualComposer('검토 중', { label: 'status', multiline: false })
  const title = useVisualComposer('캠페인 런칭', { label: 'title', multiline: false })
  const caption = useVisualComposer('이 미리보기의 라벨을 클릭해서 그대로 수정합니다.', { label: 'caption', multiline: true })

  return (
    <div className="example">
      <div className="playground">
        <h3>실행: visual contenteditable</h3>
        <div className="visual-card">
          <div className="visual-art" aria-hidden="true" />
          <div className="visual-copy">
            <div className="visual-field status" ref={status.c.containerRef} {...status.c.containerProps} />
            {status.c.portals}
            <h3 className="visual-field title" ref={title.c.containerRef} {...title.c.containerProps} />
            {title.c.portals}
            <div className="visual-field caption" ref={caption.c.containerRef} {...caption.c.containerProps} />
            {caption.c.portals}
          </div>
        </div>
        <p className="hint">각 텍스트를 클릭하고 바로 타이핑하세요. 화면에 보이는 요소가 그대로 contenteditable입니다.</p>
      </div>
      <div className="observe">
        <h3>관찰</h3>
        <pre>{JSON.stringify({
          status: { text: status.text, doc: status.doc },
          title: { text: title.text, doc: title.doc },
          caption: { text: caption.text, doc: caption.doc },
        }, null, 2)}</pre>
      </div>
      <CodeBlock code={VISUAL_CONTENTEDITABLE_SNIPPET} />
    </div>
  )
}

function useVisualComposer(initialText: string, opts: { label: string; multiline: boolean }) {
  const initialDoc = useMemo(() => textDoc(initialText), [initialText])
  const jd = useJsonDocument(
    ComposerDoc as unknown as Parameters<typeof useJsonDocument>[0],
    initialDoc, { history: 20 },
  )
  const doc = jd.value as ComposerDocType
  const ops = useMemo<JsonOps>(() => ({ apply: (patches) => { jd.ops.patch(patches) } }), [jd.ops])
  const c = useEditableComposer({
    doc,
    ops,
    triggers: {},
    multiline: opts.multiline,
    label: opts.label,
    spellCheck: true,
  })

  return { doc, text: serialize(doc), c }
}

function textDoc(text: string): typeof EMPTY_DOC {
  return { blocks: [{ kind: 'text', text }] }
}
