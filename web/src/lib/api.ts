// The server's API (crates/server/src/http.rs). The token comes once in
// the address (#t=…) and stays in this tab's session storage.

export type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error: boolean }

export type Message = { role: 'user' | 'assistant'; content: Block[] }

export type Approval = {
  id: number
  workspace: string
  tool: string
  class: string
  input: Record<string, unknown>
  created: number
}

export type WorkspaceSummary = { slug: string; name: string; waiting: number; running: boolean }

export type WorkspaceState = {
  workspace: { slug: string; name: string; created: number; tool_classes: Record<string, string>; model?: string }
  model: string
  messages: Message[]
  running: boolean
  waiting: Approval[]
  error: string | null
  skills: { name: string; description: string }[]
  mcp: { declared: string[]; running: { name: string; tools: number }[]; errors: string[] }
}

export type Info = {
  default_model: string
  providers: { name: string; key: string | null; ready: boolean }[]
}

export function readToken(): string {
  const params = new URLSearchParams(location.hash.slice(1))
  const fromUrl = params.get('t')
  try {
    if (fromUrl) {
      sessionStorage.setItem('a30m-token', fromUrl)
      history.replaceState(null, '', location.pathname)
    }
    return sessionStorage.getItem('a30m-token') || ''
  } catch {
    return fromUrl || ''
  }
}

const token = readToken()
export const hasToken = token !== ''

export async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { headers: { 'X-A30m-Token': token } }
  if (body !== undefined) {
    init.method = 'POST'
    init.headers = { ...init.headers, 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  const r = await fetch('/api/' + path, init)
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as { error?: string }).error || r.statusText)
  return data as T
}

export const store = {
  get(key: string): string | null {
    try { return localStorage.getItem(key) } catch { return null }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value) } catch { /* private mode */ }
  },
}
