export function CodeBlock({ code }: { code: string }) {
  return (
    <div className="code-cell">
      <h3>사용 코드</h3>
      <pre><code>{code}</code></pre>
    </div>
  )
}
