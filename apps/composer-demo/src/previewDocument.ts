import { readPlaygroundSource } from '@interactive-os/document'
import source from './previewDocument.source.ts?raw'

type ApiRow = readonly [name: string, description: string]
type FlowRow = readonly [name: string, description: string]

export type PreviewSection = {
  id: 'scope' | 'inline-edit' | 'cell-inline-edit' | 'composer' | 'internals' | 'tests' | 'document-surface'
  title: string
  paragraphs: readonly string[]
  flow?: readonly FlowRow[]
  bullets?: readonly string[]
}

export type PreviewDocument = {
  header: {
    kicker: string
    title: string
    description: string
    install: string
  }
  apiGroups: readonly {
    title: string
    rows: readonly ApiRow[]
  }[]
  sections: readonly PreviewSection[]
}

const parsed = readPlaygroundSource(source)

if (!isPreviewDocument(parsed)) {
  throw new Error('Invalid composer demo preview document')
}

export const previewDocument = parsed

function isPreviewDocument(value: unknown): value is PreviewDocument {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<PreviewDocument>
  return Boolean(
    candidate.header &&
    typeof candidate.header.title === 'string' &&
    Array.isArray(candidate.apiGroups) &&
    Array.isArray(candidate.sections),
  )
}
