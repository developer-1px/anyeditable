import type { ReactNode } from 'react'

export function NotebookSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="notebook-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
