import { useEffect, useState, type ReactNode } from 'react'
import { Bot, Building2, Cpu, Loader2, Palette, Plug, Shield, Trash2, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api, type WorkspaceState, type WorkspaceSummary } from '@/lib/api'
import { ConnectModel, sourceText, useProviders } from '@/components/connect'
import { LogoEditor } from '@/components/picture'
import { Panel } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTheme } from '@/hooks/use-theme'
import { store } from '@/lib/api'
import { cn } from '@/lib/utils'

export type Section = 'workspace' | 'models' | 'agent' | 'connections' | 'permissions' | 'appearance'
const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'agent', label: 'Agent', icon: Bot },
  { id: 'connections', label: 'Connections', icon: Plug },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]
const isSection = (s: string | null): s is Section => SECTIONS.some(x => x.id === s)

// After Airth's settings: a head, then rows of a label, a hint, a control.
function Head({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children && <p className="mt-1 text-sm text-muted-foreground">{children}</p>}
    </header>
  )
}

function Row({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 max-md:flex-col max-md:items-start">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

async function run(what: () => Promise<string>, after?: () => void) {
  try { toast.success(await what()); after?.() } catch (e) { toast.error((e as Error).message) }
}

/** Settings for one workspace: what it is, its models, its agent, its
    connections and what waits for the owner. */
export function Settings({ ws, state, refresh, start }: { ws: WorkspaceSummary; state: WorkspaceState; refresh: () => void; start?: Section }) {
  const [section, setSection] = useState<Section>(() => start ?? (isSection(store.get('a30m-settings')) ? store.get('a30m-settings') as Section : 'workspace'))
  useEffect(() => { if (start) setSection(start) }, [start])
  const pick = (s: Section) => { setSection(s); store.set('a30m-settings', s) }
  return (
    <div className="flex min-h-0 flex-1 max-md:flex-col">
      <nav aria-label="Settings" className="w-56 shrink-0 space-y-0.5 overflow-y-auto px-3 pt-8 max-md:flex max-md:w-auto max-md:gap-1 max-md:space-y-0 max-md:overflow-x-auto max-md:px-3 max-md:pt-3 max-md:pb-1">
        <div className="px-2.5 pb-3 max-md:hidden">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{ws.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
        </div>
        {SECTIONS.map(s => (
          <button key={s.id} type="button" onClick={() => pick(s.id)} aria-current={section === s.id}
            className={cn('flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground max-md:w-auto max-md:shrink-0',
              section === s.id && 'bg-accent text-foreground')}>
            <s.icon className="size-4 shrink-0" strokeWidth={1.8} />{s.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 pt-8 pb-16 md:px-8 max-md:pt-4">
          {section === 'workspace' && <WorkspaceSection key={ws.slug} ws={ws} state={state} refresh={refresh} />}
          {section === 'models' && <ModelsSection key={ws.slug} slug={ws.slug} refresh={refresh} />}
          {section === 'agent' && <AgentSection key={ws.slug} slug={ws.slug} state={state} refresh={refresh} />}
          {section === 'connections' && <ConnectionsSection key={ws.slug} slug={ws.slug} state={state} refresh={refresh} />}
          {section === 'permissions' && <PermissionsSection key={ws.slug} slug={ws.slug} state={state} refresh={refresh} />}
          {section === 'appearance' && <AppearanceSection />}
        </div>
      </div>
    </div>
  )
}

function WorkspaceSection({ ws, state, refresh }: { ws: WorkspaceSummary; state: WorkspaceState; refresh: () => void }) {
  const [name, setName] = useState(ws.name)
  const [desc, setDesc] = useState(state.workspace.description ?? '')
  useEffect(() => { setName(ws.name) }, [ws.name])
  const save = (body: object, done: string) => run(async () => { await api(`workspaces/${ws.slug}/settings`, body); return done }, refresh)
  return (
    <>
      <Head title="Workspace">{ws.name}, as you and its agents see it.</Head>
      <Panel className="space-y-5 p-4">
        <div className="space-y-1.5">
          <Label>Logo</Label>
          <LogoEditor slug={ws.slug} name={ws.name} version={ws.image} onDone={refresh} />
          <p className="text-xs text-muted-foreground">Shown in the app only; agents never see it.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ws-name">Name</Label>
          <div className="flex gap-2">
            <Input id="ws-name" value={name} onChange={e => setName(e.target.value)} maxLength={60} />
            <Button variant="outline" disabled={!name.trim() || name.trim() === ws.name} onClick={() => save({ name: name.trim() }, 'Name saved.')}>Save</Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ws-desc">Description</Label>
          <Textarea id="ws-desc" rows={3} value={desc} onChange={e => setDesc(e.target.value)} maxLength={2000}
            placeholder="What this workspace is for: the agents read it in every task. Example: my company's online shop for rare coins, sold in France." />
          <div className="flex justify-end"><Button variant="outline" disabled={desc.trim() === (state.workspace.description ?? '')} onClick={() => save({ description: desc.trim() }, 'Description saved.')}>Save</Button></div>
        </div>
      </Panel>
      <Panel className="mt-2.5 divide-y divide-foreground/5">
        <Row label="Address" hint="How the workspace is named on the server and in its folder. It does not change with the name.">
          <span className="font-mono text-xs text-muted-foreground">{ws.slug}</span>
        </Row>
        <Row label="Created"><span className="text-xs text-muted-foreground">{new Date(state.workspace.created * 1000).toLocaleDateString(undefined, { dateStyle: 'long' })}</span></Row>
      </Panel>
    </>
  )
}

function ModelsSection({ slug, refresh }: { slug: string; refresh: () => void }) {
  const { providers, model, reload } = useProviders(slug)
  const [searchKey, setSearchKey] = useState('')
  const [busy, setBusy] = useState(false)
  const search = providers?.find(p => p.kind === 'search')
  const keys = providers?.filter(p => p.source === 'workspace') ?? []
  const setKey = async (provider: string, key: string, done: string) => {
    setBusy(true)
    await run(async () => { await api(`workspaces/${slug}/providers/${provider}`, { key }); return done }, () => { reload(); refresh() })
    setBusy(false)
  }
  return (
    <>
      <Head title="Models">The model this workspace's agents think with, and its own keys. Another workspace never uses them.</Head>
      <Panel className="p-4">
        <p className="mb-4 text-sm">In use: <span className="font-mono">{model || '…'}</span></p>
        <ConnectModel key={slug} slug={slug} onDone={() => { reload(); refresh() }} />
      </Panel>
      <h3 className="mt-8 mb-2.5 text-sm font-semibold">Web search</h3>
      <Panel className="space-y-2 p-4">
        <p className="text-sm text-muted-foreground">Lets agents search the web, through Brave Search. Reading a page needs no key.</p>
        {search && (
          <>
            <p className={cn('text-xs', search.source ? 'text-emerald-500' : 'text-muted-foreground')}>{sourceText(search)}</p>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (searchKey.trim()) setKey('brave', searchKey.trim(), 'Web search connected.').then(() => setSearchKey('')) }}>
              <Input type="password" autoComplete="off" spellCheck={false} value={searchKey} onChange={e => setSearchKey(e.target.value)} placeholder="Brave Search key" className="font-mono" />
              <Button type="submit" variant="outline" disabled={busy || !searchKey.trim()}>{busy && <Loader2 className="animate-spin" />}Connect</Button>
            </form>
            <a href={search.key_url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-sky-500 hover:underline">Get a key</a>
          </>
        )}
      </Panel>
      <h3 className="mt-8 mb-2.5 text-sm font-semibold">This workspace's keys</h3>
      <Panel className="divide-y divide-foreground/5">
        {!keys.length && <p className="px-4 py-3 text-sm text-muted-foreground">None yet. Without its own key, a workspace uses the server's, if it has one.</p>}
        {keys.map(p => (
          <Row key={p.name} label={p.label} hint={<span className="font-mono">{p.hint}</span>}>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setKey(p.name, '', `${p.label}: this workspace's key removed.`)}><Trash2 />Remove</Button>
          </Row>
        ))}
      </Panel>
      <p className="mt-2 text-xs text-muted-foreground">Keys stay on your server, readable by the server alone, and are never shown again.</p>
    </>
  )
}

function AgentSection({ slug, state, refresh }: { slug: string; state: WorkspaceState; refresh: () => void }) {
  const [text, setText] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [path, setPath] = useState('')
  useEffect(() => {
    api<{ text: string }>(`workspaces/${slug}/instructions`).then(r => { setText(r.text); setSaved(r.text) }).catch(() => {})
  }, [slug])
  return (
    <>
      <Head title="Agent">What the agent should know, and what it knows how to do.</Head>
      <h3 className="mb-2.5 text-sm font-semibold">Instructions</h3>
      <Panel className="space-y-2 p-4">
        <p className="text-sm text-muted-foreground">Read before every task: who you are, how to answer, what it must never do. Agents cannot change them.</p>
        <Textarea rows={10} value={text ?? ''} disabled={text === null} onChange={e => setText(e.target.value)} className="font-mono text-xs" />
        <div className="flex justify-end">
          <Button variant="outline" disabled={text === null || text === saved} onClick={() => run(async () => {
            await api(`workspaces/${slug}/instructions`, { text: text ?? '' }); setSaved(text); return 'Instructions saved. They apply from the next message.'
          })}>Save</Button>
        </div>
      </Panel>
      <h3 className="mt-8 mb-2.5 text-sm font-semibold">Skills</h3>
      <Panel className="divide-y divide-foreground/5">
        {!state.skills.length && <p className="px-4 py-3 text-sm text-muted-foreground">None yet. Import an Agent Plugin or a skill below.</p>}
        {state.skills.map(k => <Row key={k.name} label={k.name} hint={k.description}><span /></Row>)}
      </Panel>
      <h3 className="mt-8 mb-2.5 text-sm font-semibold">Import</h3>
      <Panel className="space-y-2 p-4">
        <p className="text-sm text-muted-foreground">An Agent Plugin or a skill folder, on the server's machine. Its skills and MCP servers are added to this workspace.</p>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (path.trim()) run(async () => { const r = await api<{ imported: string[] }>(`workspaces/${slug}/import`, { path: path.trim() }); setPath(''); return `Imported: ${r.imported.join(', ')}.` }, refresh) }}>
          <Input value={path} onChange={e => setPath(e.target.value)} placeholder="/path/to/plugin" className="font-mono" />
          <Button type="submit" variant="outline" disabled={!path.trim()}>Import</Button>
        </form>
      </Panel>
    </>
  )
}

function ConnectionsSection({ state }: { slug: string; state: WorkspaceState; refresh: () => void }) {
  const declared = state.mcp.declared.filter(n => !state.mcp.running.some(m => m.name === n))
  return (
    <>
      <Head title="Connections">The services this workspace's agent may use, through MCP servers. Import a plugin in Agent to add one.</Head>
      <Panel className="divide-y divide-foreground/5">
        {state.mcp.running.map(m => (
          <Row key={m.name} label={m.name} hint={`${m.tools} tools`}><span className="inline-flex items-center gap-1.5 text-xs text-emerald-500"><span className="size-1.5 rounded-full bg-emerald-500" />Running</span></Row>
        ))}
        {declared.map(n => (
          <Row key={n} label={n} hint="Starts with the next message"><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-muted-foreground" />Stopped</span></Row>
        ))}
        {!state.mcp.running.length && !declared.length && <p className="px-4 py-3 text-sm text-muted-foreground">None yet.</p>}
      </Panel>
      {state.mcp.errors.map(e => <p key={e} className="mt-2 text-sm text-red-500">{e}</p>)}
    </>
  )
}

function PermissionsSection({ slug, state, refresh }: { slug: string; state: WorkspaceState; refresh: () => void }) {
  const [tool, setTool] = useState('')
  const [cls, setCls] = useState('read')
  const classes = Object.entries(state.workspace.tool_classes || {})
  const save = (t: string, c: string, done: string) => run(async () => { await api(`workspaces/${slug}/classes`, { tool: t, class: c }); return done }, refresh)
  return (
    <>
      <Head title="Permissions">Reads run alone; anything that commits waits for you. Change a tool's class for this workspace only.</Head>
      <Panel className="divide-y divide-foreground/5">
        {!classes.length && <p className="px-4 py-3 text-sm text-muted-foreground">Every tool keeps its own class.</p>}
        {classes.map(([t, c]) => (
          <Row key={t} label={t} hint={c === 'commits' ? 'Waits for you' : 'Runs alone'}>
            <Button variant="ghost" size="sm" onClick={() => save(t, 'default', `${t}: back to its default.`)}>Back to default</Button>
          </Row>
        ))}
      </Panel>
      <h3 className="mt-8 mb-2.5 text-sm font-semibold">Change a tool</h3>
      <Panel className="p-4">
        <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); if (tool.trim()) save(tool.trim(), cls, 'Saved.').then(() => setTool('')) }}>
          <Input value={tool} onChange={e => setTool(e.target.value)} placeholder="Tool name, e.g. web_fetch" className="min-w-48 flex-1 font-mono" />
          <Select value={cls} onValueChange={v => setCls(String(v))}>
            <SelectTrigger className="min-w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="read">read: runs alone</SelectItem>
              <SelectItem value="reversible">reversible: runs alone</SelectItem>
              <SelectItem value="commits">commits: waits for you</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" disabled={!tool.trim()}>Save</Button>
        </form>
      </Panel>
    </>
  )
}

function AppearanceSection() {
  const { choice, setTheme } = useTheme()
  const options: [typeof choice, string][] = [['system', 'As the system'], ['light', 'Light'], ['dark', 'Dark']]
  return (
    <>
      <Head title="Appearance">For this browser, every workspace.</Head>
      <Panel className="divide-y divide-foreground/5">
        <Row label="Theme">
          <div role="radiogroup" aria-label="Theme" className="flex rounded-lg bg-background/60 p-0.5">
            {options.map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={choice === v} onClick={() => setTheme(v)}
                className={cn('rounded-md px-2.5 py-1 text-xs transition-colors', choice === v ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')}>{l}</button>
            ))}
          </div>
        </Row>
      </Panel>
    </>
  )
}
