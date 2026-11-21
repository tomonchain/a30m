import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api, hasToken, store, type WorkspaceState, type WorkspaceSummary } from '@/lib/api'
import { Menu, PAGES, SpacesBar, type Page } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useTheme } from '@/hooks/use-theme'
import { Chat } from '@/screens/chat'
import { NeedsYou } from '@/screens/needs'
import { Files } from '@/screens/files'
import { Settings, type Section } from '@/screens/settings'
import { Onboarding } from '@/screens/onboarding'
import { Soon, SOON_TEXT } from '@/screens/soon'

const isPage = (p: string | null): p is Page => PAGES.some(x => x.id === p)

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="m-auto max-w-md p-6 text-center">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

export default function App() {
  const [list, setList] = useState<WorkspaceSummary[]>([])
  const [current, setCurrent] = useState(store.get('a30m-ws') || '')
  const [page, setPage] = useState<Page>(() => { const p = store.get('a30m-page'); return isPage(p) ? p : 'chat' })
  const [section, setSection] = useState<Section | undefined>(undefined)
  const [state, setState] = useState<WorkspaceState | null>(null)
  const [down, setDown] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [onboard, setOnboard] = useState<{ slug: string; name: string } | null>(null)
  // The first visit's onboarding stays until it ends, even once its
  // workspace exists.
  const [firstRun, setFirstRun] = useState(false)
  const { theme, setTheme } = useTheme()
  const timer = useRef<number>(undefined)
  const currentRef = useRef(current)
  currentRef.current = current

  const refresh = useCallback(async () => {
    window.clearTimeout(timer.current)
    let next: WorkspaceState | null = null
    try {
      const { workspaces } = await api<{ workspaces: WorkspaceSummary[] }>('workspaces')
      setList(workspaces)
      if (!workspaces.length) setFirstRun(true)
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
    return () => window.clearTimeout(timer.current)
  }, [refresh])

  const pick = (slug: string) => {
    if (slug === currentRef.current) { refresh(); return }
    setCurrent(slug); currentRef.current = slug; store.set('a30m-ws', slug); setState(null); refresh()
  }
  const go = (p: Page, s?: Section) => { setPage(p); store.set('a30m-page', p); setSection(s) }
  const create = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      const r = await api<{ slug: string }>('workspaces', { name })
      setAdding(false); setNewName(''); go('chat'); pick(r.slug); setOnboard({ slug: r.slug, name })
    } catch (e) { toast.error((e as Error).message) }
  }

  if (!hasToken) return <div className="flex h-dvh"><Message title="Open a30m from the server">Open the address the server printed when it started; it ends with #t=…</Message></div>
  if (firstRun) return <div className="flex h-dvh"><Onboarding onFinish={slug => { setFirstRun(false); go('chat'); pick(slug) }} /></div>

  const ws = list.find(w => w.slug === current)
  let body: React.ReactNode = null
  if (down) body = <Message title="Cannot reach the server">{down}</Message>
  else if (!ws || !state) body = null
  else if (onboard && onboard.slug === current) body = <Onboarding key={onboard.slug} start={onboard} onFinish={() => { setOnboard(null); go('chat'); refresh() }} />
  else if (page === 'chat') body = <Chat key={ws.slug} slug={ws.slug} name={ws.name} state={state} refresh={refresh} onSettings={() => go('settings', 'models')} />
  else if (page === 'needs') body = <NeedsYou name={ws.name} state={state} refresh={refresh} />
  else if (page === 'files') body = <Files key={ws.slug} slug={ws.slug} name={ws.name} tick={state.messages.length} />
  else if (page === 'settings') body = <Settings ws={ws} state={state} refresh={refresh} start={section} />
  else { const p = PAGES.find(x => x.id === page)!; body = <Soon name={ws.name} title={p.label} icon={p.icon} what={SOON_TEXT[page]} /> }

  return (
    <TooltipProvider>
      <div className="flex h-dvh max-md:flex-col">
        <SpacesBar list={list} current={current} onPick={pick} onAdd={() => setAdding(true)} theme={theme} onTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
        {ws && <Menu name={ws.name} description={state?.workspace.description ?? ''} state={state} page={page} onPage={p => go(p)} />}
        <main className="m-2 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-surface max-md:m-0 max-md:rounded-none">
          {body}
        </main>
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogContent>
            <form onSubmit={e => { e.preventDefault(); create() }} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>New workspace</DialogTitle>
                <DialogDescription>A workspace keeps its own agent, files, connections, keys and conversations, apart from the others.</DialogDescription>
              </DialogHeader>
              <Input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name, e.g. Personal or Acme Ltd" autoComplete="off" />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                <Button type="submit" disabled={!newName.trim()}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
