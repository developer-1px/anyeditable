import { NotebookSection } from './docs/NotebookSection.js'
import { ComposerExample } from './examples/ComposerExample.js'
import { DocumentSurfaceExample } from './examples/DocumentSurfaceExample.js'
import { NativeDocumentScratchExample } from './examples/NativeDocumentScratchExample.js'
import { VisualContenteditableExample } from './examples/VisualContenteditableExample.js'
import { previewDocument, type PreviewSection } from './previewDocument.js'

export function App() {
  const { header, apiGroups, sections } = previewDocument
  const sectionById = new Map(sections.map(section => [section.id, section]))
  const section = (id: PreviewSection['id']) => {
    const found = sectionById.get(id)
    if (!found) throw new Error(`Missing preview section: ${id}`)
    return found
  }
  const scope = section('scope')
  const inlineEdit = section('inline-edit')
  const composer = section('composer')
  const internals = section('internals')
  const tests = section('tests')
  const documentSurface = section('document-surface')
  const nativeDocumentScratch = section('native-document-scratch')

  return (
    <main className="doc">
      <header className="doc-header">
        <p className="kicker">{header.kicker}</p>
        <h1>{header.title}</h1>
        <p>{header.description}</p>
        <pre className="install"><code>{header.install}</code></pre>
      </header>

      <NotebookSection id={scope.id} title={scope.title}>
        <SectionParagraphs section={scope} />
        <div className="api-groups">
          {apiGroups.map(group => (
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

      <NotebookSection id={inlineEdit.id} title={inlineEdit.title}>
        <SectionParagraphs section={inlineEdit} />
        <VisualContenteditableExample />
      </NotebookSection>

      <NotebookSection id={composer.id} title={composer.title}>
        <SectionParagraphs section={composer} />
        <ComposerExample />
      </NotebookSection>

      <NotebookSection id={internals.id} title={internals.title}>
        <SectionParagraphs section={internals} />
        <ol className="flow">
          {internals.flow?.map(([name, description]) => (
            <li key={name}><strong>{name}</strong><span>{description}</span></li>
          ))}
        </ol>
      </NotebookSection>

      <NotebookSection id={tests.id} title={tests.title}>
        <SectionParagraphs section={tests} />
        <ul>
          {tests.bullets?.map(item => <li key={item}>{item}</li>)}
        </ul>
      </NotebookSection>

      <NotebookSection id={documentSurface.id} title={documentSurface.title}>
        <SectionParagraphs section={documentSurface} />
        <DocumentSurfaceExample />
      </NotebookSection>

      <NotebookSection id={nativeDocumentScratch.id} title={nativeDocumentScratch.title}>
        <SectionParagraphs section={nativeDocumentScratch} />
        <NativeDocumentScratchExample />
      </NotebookSection>
    </main>
  )
}

function SectionParagraphs({ section }: { section: PreviewSection }) {
  return section.paragraphs.map(text => <p key={text}>{text}</p>)
}
