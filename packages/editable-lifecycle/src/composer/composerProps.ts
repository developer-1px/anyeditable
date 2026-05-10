import type { HTMLAttributes } from 'react'
import type { ComposerDoc } from './schema.js'

/** rootProps factory — WAI-ARIA APG combobox/textbox attributes. */
export function rootPropsOf(args: {
  setRef: (el: HTMLElement | null) => void
  multiline: boolean
  readOnly: boolean
  placeholder: string | undefined
  onKeyDown: HTMLAttributes<HTMLElement>['onKeyDown']
}): HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void } {
  return {
    ref: args.setRef,
    contentEditable: !args.readOnly,
    role: 'textbox',
    'aria-multiline': args.multiline,
    'aria-readonly': args.readOnly || undefined,
    'aria-placeholder': args.placeholder,
    'data-placeholder': args.placeholder,
    suppressContentEditableWarning: true,
    onKeyDown: args.onKeyDown,
  } as HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void }
}

export function blockPropsOf(doc: ComposerDoc, i: number): HTMLAttributes<HTMLElement> {
  const b = doc.blocks[i]
  return { 'data-block-index': i, 'data-block-kind': b?.kind } as HTMLAttributes<HTMLElement>
}

export function atomicPropsOf(doc: ComposerDoc, i: number): HTMLAttributes<HTMLElement> {
  const b = doc.blocks[i]
  return {
    contentEditable: false,
    'aria-label': b?.kind === 'mention' ? b.label : b?.kind === 'command' ? '/' + b.name : undefined,
  } as HTMLAttributes<HTMLElement>
}
