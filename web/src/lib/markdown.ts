// A small Markdown reader for agents' answers. It returns a tree, never
// HTML: React renders the text, so nothing in an answer can run.

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'b'; c: Inline[] }
  | { t: 'i'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'a'; href: string; c: Inline[] }

export type Node =
  | { t: 'p'; lines: Inline[][] }
  | { t: 'h'; c: Inline[] }
  | { t: 'ul' | 'ol'; items: Inline[][] }
  | { t: 'pre'; v: string }

export function inline(s: string): Inline[] {
  const out: Inline[] = []
  let text = ''
  const push = () => { if (text) { out.push({ t: 'text', v: text }); text = '' } }
  let i = 0
  while (i < s.length) {
    const rest = s.slice(i)
    let m: RegExpMatchArray | null
    if ((m = rest.match(/^`([^`]+)`/))) { push(); out.push({ t: 'code', v: m[1] }); i += m[0].length; continue }
    if ((m = rest.match(/^\*\*([^*]+)\*\*/))) { push(); out.push({ t: 'b', c: inline(m[1]) }); i += m[0].length; continue }
    if ((m = rest.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/))) { push(); out.push({ t: 'a', href: m[2], c: inline(m[1]) }); i += m[0].length; continue }
    if ((m = rest.match(/^\*([^*\s][^*]*)\*/)) && !/\w/.test(s[i - 1] || '')) { push(); out.push({ t: 'i', c: inline(m[1]) }); i += m[0].length; continue }
    text += s[i]
    i += 1
  }
  push()
  return out
}

export function parse(src: string): Node[] {
  const out: Node[] = []
  let para: string[] = []
  let list: { t: 'ul' | 'ol'; items: string[] } | null = null
  let code: string[] | null = null
  const flush = () => {
    if (para.length) { out.push({ t: 'p', lines: para.map(inline) }); para = [] }
    if (list) { out.push({ t: list.t, items: list.items.map(inline) }); list = null }
  }
  for (const line of src.split('\n')) {
    if (code) {
      if (line.startsWith('```')) { out.push({ t: 'pre', v: code.join('\n') }); code = null } else code.push(line)
      continue
    }
    if (line.startsWith('```')) { flush(); code = []; continue }
    const h = line.match(/^#{1,4}\s+(.*)/)
    const ul = line.match(/^\s*[-*•]\s+(.*)/)
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/)
    if (h) { flush(); out.push({ t: 'h', c: inline(h[1]) }) }
    else if (ul || ol) {
      const t = ul ? 'ul' : 'ol'
      if (para.length || (list && list.t !== t)) flush()
      if (!list) list = { t, items: [] }
      list.items.push((ul || ol)![1])
    } else if (!line.trim()) flush()
    else { if (list) flush(); para.push(line) }
  }
  if (code) out.push({ t: 'pre', v: code.join('\n') })
  flush()
  return out
}
