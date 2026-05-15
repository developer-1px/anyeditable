export const playground = {
  header: {
    kicker: '기술 노트 / playground',
    title: '@interactive-os/anyeditable',
    description: 'React에서 직접 만든 편집 UI에 붙이는 headless editing lifecycle hook입니다. 아직 범용 editor framework가 아니라, 현재는 두 가지 편집 surface를 안정적으로 다루는 패키지입니다.',
    install: 'npm i @interactive-os/anyeditable',
  },
  apiGroups: [
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
  ],
  sections: [
    {
      id: 'scope',
      title: '0. 현재 제공하는 것',
      paragraphs: [
        '이 패키지의 중심은 컴포넌트가 아니라 lifecycle입니다. UI, markup, CSS, design token은 앱이 소유하고, 패키지는 편집 시작, draft, commit, cancel, selection, paste, IME 같은 브라우저 편집 흐름을 맡습니다.',
      ],
    },
    {
      id: 'inline-edit',
      title: '1. 기본형: visual contenteditable',
      paragraphs: [
        '가장 중요한 사용 형태는 이미 렌더링된 시각적 콘텐츠를 그 자리에서 수정하는 것입니다. 제목, 배지, 캡션 같은 화면 요소 자체를 contenteditable surface로 두고 바로 편집합니다.',
      ],
    },
    {
      id: 'cell-inline-edit',
      title: '2. input 기반 cell/grid inline edit',
      paragraphs: [
        '같은 lifecycle을 표나 그리드에 붙이면 type-to-edit, 이동 후 commit, blur commit을 재사용할 수 있습니다. 이 예제는 useEditable의 input 기반 usage만 보여줍니다.',
      ],
    },
    {
      id: 'composer',
      title: '3. 확장형: contenteditable composer',
      paragraphs: [
        '채팅 composer처럼 trigger, atomic chip, submit이 필요해지면 같은 useEditableSurface를 더 넓게 씁니다. 이 영역은 flat ComposerDoc과 patch 흐름으로 다룹니다.',
      ],
    },
    {
      id: 'internals',
      title: '4. 내부 흐름',
      paragraphs: [
        '현재 composer의 핵심 흐름은 아래 정도로만 이해하면 됩니다. 파일 구조 설명은 이 흐름 뒤에 붙는 보조 정보입니다.',
      ],
      flow: [
        ['Input Events', 'beforeinput, compositionend가 native edit intent를 만든다.'],
        ['Selection API', 'DOM caret/range를 document position으로 바꾼다.'],
        ['RFC 6902 patches', 'insert/delete/range/atomic 조작을 patch로 표현한다.'],
        ['DOM reconcile', 'model을 contenteditable DOM에 되돌리고 caret을 복원한다.'],
      ],
    },
    {
      id: 'tests',
      title: '5. 테스트 계약',
      paragraphs: [
        '현재 demo는 문서이면서 browser smoke surface입니다. composer 계약은 기존 e2e가 계속 검증합니다.',
      ],
      bullets: [
        'unit/integration: 187 tests',
        'browser e2e: 70 scenarios',
        '커버 범위: IME, paste, selection, atomic chip, undo/redo, submit',
      ],
    },
    {
      id: 'document-surface',
      title: '6. Block document surface',
      paragraphs: [
        'Obsidian-style editor core를 위한 block 문서 편집 surface입니다. 문서 block model은 host가 소유하고, surface는 contenteditable DOM, selection mapping, beforeinput operation emission만 맡습니다.',
      ],
    },
    {
      id: 'native-document-scratch',
      title: '7. Zero-base native document scratch',
      paragraphs: [
        '6번을 땜질하지 않고, contenteditable의 최신 production 원칙에 맞춰 다시 만든 실험 surface입니다. IME와 일반 입력은 native DOM을 먼저 믿고, input 이후 state가 따라오며, 구조 변경만 beforeinput에서 가로챕니다.',
      ],
    },
  ],
} as const
