import { NotebookSection } from './docs/NotebookSection.js'
import { CellInlineEditExample } from './examples/CellInlineEditExample.js'
import { ComposerExample } from './examples/ComposerExample.js'
import { VisualContenteditableExample } from './examples/VisualContenteditableExample.js'

const API_GROUPS = [
  {
    title: '주요 hook',
    rows: [
      ['useEditableSurface', 'contenteditable 기반 visual surface와 composer lifecycle'],
      ['useEditable', 'input, textarea, select 기반 inline edit lifecycle'],
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

      <NotebookSection id="inline-edit" title="1. 기본형: visual contenteditable">
        <p>
          가장 중요한 사용 형태는 이미 렌더링된 시각적 콘텐츠를 그 자리에서 수정하는 것입니다.
          제목, 배지, 캡션 같은 화면 요소 자체를 <code>contenteditable</code> surface로 두고 바로 편집합니다.
        </p>
        <VisualContenteditableExample />
      </NotebookSection>

      <NotebookSection id="cell-inline-edit" title="2. input 기반 cell/grid inline edit">
        <p>
          같은 lifecycle을 표나 그리드에 붙이면 type-to-edit, 이동 후 commit, blur commit을 재사용할 수 있습니다.
          이 예제는 <code>useEditable</code>의 input 기반 usage만 보여줍니다.
        </p>
        <CellInlineEditExample />
      </NotebookSection>

      <NotebookSection id="composer" title="3. 확장형: contenteditable composer">
        <p>
          채팅 composer처럼 trigger, atomic chip, submit이 필요해지면 같은 <code>useEditableSurface</code>를 더 넓게 씁니다.
          이 영역은 flat <code>ComposerDoc</code>과 patch 흐름으로 다룹니다.
        </p>
        <ComposerExample />
      </NotebookSection>

      <NotebookSection id="internals" title="4. 내부 흐름">
        <p>현재 composer의 핵심 흐름은 아래 정도로만 이해하면 됩니다. 파일 구조 설명은 이 흐름 뒤에 붙는 보조 정보입니다.</p>
        <ol className="flow">
          <li><strong>Input Events</strong><span>beforeinput, compositionend가 native edit intent를 만든다.</span></li>
          <li><strong>Selection API</strong><span>DOM caret/range를 document position으로 바꾼다.</span></li>
          <li><strong>RFC 6902 patches</strong><span>insert/delete/range/atomic 조작을 patch로 표현한다.</span></li>
          <li><strong>DOM reconcile</strong><span>model을 contenteditable DOM에 되돌리고 caret을 복원한다.</span></li>
        </ol>
      </NotebookSection>

      <NotebookSection id="tests" title="5. 테스트 계약">
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
