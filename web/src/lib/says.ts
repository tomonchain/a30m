// What a tool call does, in plain words, with the icon that goes with it.

export type Said = { icon: 'files' | 'file' | 'pen' | 'book' | 'search' | 'globe' | 'plug'; text: string }

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export function hostPath(url: string): string {
  try {
    const u = new URL(url)
    return u.host + (u.pathname === '/' ? '' : u.pathname)
  } catch {
    return url
  }
}

export function says(name: string, input: Record<string, unknown> = {}): Said {
  switch (name) {
    case 'list_files': return { icon: 'files', text: str(input.path) ? `Looked in ${str(input.path)}` : "Looked in the workspace's folder" }
    case 'read_file': return { icon: 'file', text: `Read ${str(input.path)}` }
    case 'write_file': return { icon: 'pen', text: `Wrote ${str(input.path)}` }
    case 'read_skill': return { icon: 'book', text: `Read the skill ${str(input.name)}` }
    case 'web_search': return { icon: 'search', text: `Searched the web for “${str(input.query)}”` }
    case 'web_fetch': return { icon: 'globe', text: `Read ${hostPath(str(input.url))}` }
  }
  const m = name.match(/^mcp__(.+?)__(.+)$/)
  if (m) return { icon: 'plug', text: `${m[1]} · ${m[2].replace(/_/g, ' ')}` }
  return { icon: 'plug', text: name }
}

/// What approving does, said on the card.
export function approving(tool: string): string {
  if (tool === 'web_fetch') return 'Approving lets the agent read this page once. Its address leaves the server.'
  return 'Approving runs it once, as shown.'
}
