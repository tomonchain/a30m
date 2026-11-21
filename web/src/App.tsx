import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api, hasToken, store, type Info, type WorkspaceState, type WorkspaceSummary } from '@/lib/api'
import { Menu, PAGES, SpacesBar, type Page } from '@/components/shell'
import { Empty } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Chat } from '@/screens/chat'
import { NeedsYou } from '@/screens/needs'
import { Agent } from '@/screens/agent'
import { Soon, SOON_TEXT } from '@/screens/soon'
import { Files } from '@/screens/files'

const isPage = (p: string | null): p is Page => PAGES.some(x => x.id === p)

export default function App() {
  const [list, setList] = useState<WorkspaceSummary[]>([])
  const [current, setCurrent] = useState(store.get('a30m-ws') || '')
  const [page, setPage] = useState<Page>(() => { const p = store.get('a30m-page'); return isPage(p) ? p : 'chat' })
  const [state, setState] = useState<WorkspaceState | null>(null)
  const [info, setInfo] = useState<Info | null>(null)
  const [down, setDown] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  const timer = useRef<number>(undefined)
  const currentRef = useRef(current)
  currentRef.current = current

  const refresh = useCallback(async () => {
    window.clearTimeout(timer.current)
    let next: WorkspaceState | null = null
    try {
      const { workspaces } = await api<{ workspaces: WorkspaceSummary[] }>('workspaces')
      setList(workspaces)
      let slug = currentRef.current
      if (!workspaces.some(w => w.slug === slug)) {
        slug = workspaces[0]?.slug ?? ''
        setCurrent(slug)
        store.set('a30m-ws', slug)
      }
      if (slug) {
        next = await api<WorkspaceState>('workspaces/' + slug)
        if (slug === currentRef.current) setState(next)
      } else setState(null)
      setDown(null)
    } catch (e) {
      setDown((e as Error).message)
    }
    const busy = next && (next.running || next.waiting.length)
    timer.current = window.setTimeout(refresh, busy ? 1200 : 4000)
  }, [])

  useEffect(() => {
    if (!hasToken) return
    refresh()
    api<Info>('info').then(setInfo).catch(() => {})
    return () => window.clearTimeout(timer.current)
  }, [refresh])

  const pick = (slug: string) => {
    if (slug === current) return
    setCurrent(slug); currentRef.current = slug; store.set('a30m-ws', slug); setState(null); refresh()
  }
  const go = (p: Page) => { setPage(p); store.set('a30m-page', p) }
  const flip = () => {
    const t = theme === 'light' ? 'dark' : 'light'
    setTheme(t); document.documentElement.dataset.theme = t; store.set('a30m-theme', t)
  }
  const create = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      const r = await api<{ slug: string }>('workspaces', { name })
      setAdding(false); setNewName(''); go('chat'); pick(r.slug)
    } catch (e) { toast.error((e as Error).message) }
  }

  const ws = list.find(w => w.slug === current)
  let body: React.ReactNode
  if (!hasToken) body = <Empty title="Open a30m from the server">Open the address the server printed when it started; it ends with #t=…</Empty>
  else if (down) body = <Empty title="Cannot reach the server">{down}</Empty>
  else if (!list.length) body = <Empty title="No workspace yet" action={<Button variant="primary" onClick={() => setAdding(true)}>New workspace</Button>}>A workspace keeps its own agent, files, connections and conversations, apart from the others.</Empty>
  else if (!ws || !state) body = null
  else if (page === 'chat') body = <Chat key={ws.slug} slug={ws.slug} name={ws.name} state={state} refresh={refresh} />
  else if (page === 'needs') body = <NeedsYou name={ws.name} state={state} refresh={refresh} />
  else if (page === 'files') body = <Files key={ws.slug} slug={ws.slug} name={ws.name} tick={state.messages.length} />
  else if (page === 'agent') body = <Agent key={ws.slug} slug={ws.slug} name={ws.name} state={state} info={info} refresh={refresh} />
  else { const p = PAGES.find(x => x.id === page)!; body = <Soon name={ws.name} title={p.label} icon={p.icon} what={SOON_TEXT[page]} /> }

  return (
    <div className="flex h-dvh max-[720px]:flex-col">
      <SpacesBar list={list} current={current} onPick={pick} onAdd={() => setAdding(true)} theme={theme} onTheme={flip} />
      {ws && <Menu name={ws.name} state={state} page={page} onPage={go} />}
      <main className="m-3 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line-soft bg-panel max-[720px]:m-0 max-[720px]:rounded-none max-[720px]:border-x-0 max-[720px]:border-b-0">
        {body}
      </main>
      <Dialog open={adding} onOpenChange={setAdding} title="New workspace" description="A workspace keeps its own agent, files, connections and conversations, apart from the others.">
        <form onSubmit={e => { e.preventDefault(); create() }}>
          <Input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name, e.g. Personal or Acme Ltd" autoComplete="off" />
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
