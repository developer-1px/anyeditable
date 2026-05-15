import { NotebookSection } from './docs/NotebookSection.js'
import { CellInlineEditExample } from './examples/CellInlineEditExample.js'
import { ComposerExample } from './examples/ComposerExample.js'
import { VisualContenteditableExample } from './examples/VisualContenteditableExample.js'
import { previewDocument, type PreviewSection } from './previewDocument.js'

export function App() {
  const { header, apiGroups, sections } = previewDocument

  return (
    <main className="doc">
      <header className="doc-header">
        <p className="kicker">{header.kicker}</p>
        <h1>{header.title}</h1>
        <p>{header.description}</p>
        <pre className="install"><code>{header.install}</code></pre>
      </header>

      <NotebookSection id={sections[0]!.id} title={sections[0]!.title}>
        <SectionParagraphs section={sections[0]!} />
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

      <NotebookSection id={sections[1]!.id} title={sections[1]!.title}>
        <SectionParagraphs section={sections[1]!} />
        <VisualContenteditableExample />
      </NotebookSection>

      <NotebookSection id={sections[2]!.id} title={sections[2]!.title}>
        <SectionParagraphs section={sections[2]!} />
        <CellInlineEditExample />
      </NotebookSection>

      <NotebookSection id={sections[3]!.id} title={sections[3]!.title}>
        <SectionParagraphs section={sections[3]!} />
        <ComposerExample />
      </NotebookSection>

      <NotebookSection id={sections[4]!.id} title={sections[4]!.title}>
        <SectionParagraphs section={sections[4]!} />
        <ol className="flow">
          {sections[4]!.flow?.map(([name, description]) => (
            <li key={name}><strong>{name}</strong><span>{description}</span></li>
          ))}
        </ol>
      </NotebookSection>

      <NotebookSection id={sections[5]!.id} title={sections[5]!.title}>
        <SectionParagraphs section={sections[5]!} />
        <ul>
          {sections[5]!.bullets?.map(item => <li key={item}>{item}</li>)}
        </ul>
      </NotebookSection>
    </main>
  )
}

function SectionParagraphs({ section }: { section: PreviewSection }) {
  return section.paragraphs.map(text => <p key={text}>{text}</p>)
}
