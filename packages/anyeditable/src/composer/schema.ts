import * as z from 'zod'

export const TextBlock = z.object({
  kind: z.literal('text'),
  text: z.string(),
})

/** Mention atomic. `label` is the display name WITHOUT trigger prefix
 *  — serialize/render adds the '@'. */
export const MentionBlock = z.object({
  kind: z.literal('mention'),
  id: z.string(),
  label: z.string(),
})

/** Command atomic. `name` is the command identifier WITHOUT trigger prefix
 *  — serialize/render adds the '/'. */
export const CommandBlock = z.object({
  kind: z.literal('command'),
  name: z.string(),
})

export const Block = z.discriminatedUnion('kind', [TextBlock, MentionBlock, CommandBlock])

export const ComposerDoc = z.object({
  blocks: z.array(Block),
})

export type Block = z.infer<typeof Block>
export type ComposerDoc = z.infer<typeof ComposerDoc>
export type AtomicKind = 'mention' | 'command'

export const EMPTY_DOC: ComposerDoc = { blocks: [] }
