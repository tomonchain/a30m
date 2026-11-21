import { Fragment } from 'react'
import { parse, type Inline } from '@/lib/markdown'

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((n, i) => {
        switch (n.t) {
          case 'text': return <Fragment key={i}>{n.v}</Fragment>
          case 'code': return <code key={i} className="rounded-md bg-chip px-1.5 py-px font-mono text-secondary">{n.v}</code>
          case 'b': return <b key={i} className="font-semibold text-text"><Inlines items={n.c} /></b>
          case 'i': return <i key={i}><Inlines items={n.c} /></i>
          case 'a': return <a key={i} href={n.href} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover"><Inlines items={n.c} /></a>
        }
      })}
    </>
  )
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2.5 text-text-2 [overflow-wrap:anywhere]">
      {parse(text).map((n, i) => {
        switch (n.t) {
          case 'p': return <p key={i}>{n.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}<Inlines items={l} /></Fragment>)}</p>
          case 'h': return <h3 key={i} className="pt-1 text-card-title font-semibold text-text"><Inlines items={n.c} /></h3>
          case 'ul': return <ul key={i} className="list-disc space-y-1 pl-5">{n.items.map((it, j) => <li key={j}><Inlines items={it} /></li>)}</ul>
          case 'ol': return <ol key={i} className="list-decimal space-y-1 pl-5">{n.items.map((it, j) => <li key={j}><Inlines items={it} /></li>)}</ol>
          case 'pre': return <pre key={i} className="overflow-auto whitespace-pre-wrap rounded-[10px] border border-line bg-card px-3 py-2.5 font-mono text-secondary">{n.v}</pre>
        }
      })}
    </div>
  )
}
