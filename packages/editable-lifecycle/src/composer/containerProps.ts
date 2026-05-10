import type { HTMLAttributes, KeyboardEventHandler } from 'react'

export interface ContainerPropsArgs {
  multiline: boolean
  readOnly: boolean
  placeholder: string | undefined
  spellCheck: boolean | undefined
  onKeyDown: KeyboardEventHandler<HTMLElement>
}

/** WAI-ARIA APG textbox attributes for the contenteditable container. */
export function buildContainerProps(a: ContainerPropsArgs): HTMLAttributes<HTMLElement> {
  return {
    contentEditable: !a.readOnly,
    role: 'textbox',
    'aria-multiline': a.multiline,
    'aria-readonly': a.readOnly || undefined,
    'aria-placeholder': a.placeholder,
    'data-placeholder': a.placeholder,
    spellCheck: a.spellCheck,
    suppressContentEditableWarning: true,
    onKeyDown: a.onKeyDown,
  } as HTMLAttributes<HTMLElement>
}
