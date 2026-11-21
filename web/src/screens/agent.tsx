import { useState } from 'react'
import { toast } from 'sonner'
import { api, type Info, type WorkspaceState } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input, NativeSelect } from '@/components/ui/input'
import { Card, CardDescription, CardTitle, Chip } from '@/components/ui/card'
import { Column, PageHead, Scroll } from '@/components/page'
import { cn } from '@/lib/utils'

const MODELS = [
  'anthropic/claude-sonnet-5-5', 'anthropic/claude-opus-5-5', 'openai/gpt-6.1-sol', 'xai/grok-4.7',
  'gemini/gemini-pro-latest', 'gemini/gemini-flash-latest', 'ollama/llama3.3', 'echo', 'default',
]

export function Agent({ slug, name, state, info, refresh }: { slug: string; name: string; state: WorkspaceState; info: Info | null; refresh: () => void }) {
  const [model, setModel] = useState('')
  const [path, setPath] = useState('')
  const [tool, setTool] = useState('')
  const [cls, setCls] = useState('read')
  const ready = info?.providers.filter(p => p.ready).map(p => p.name) ?? []
  const run = async (what: () => Promise<string>) => {
    try { toast.success(await what()); refresh() } catch (e) { toast.error((e as Error).message) }
  }
  const classes = Object.entries(state.workspace.tool_classes || {})
  const declared = state.mcp.declared.filter(n => !state.mcp.running.some(m => m.name === n))
  const Dot = ({ on }: { on: boolean }) => <span className={cn('size-1.5 rounded-full', on ? 'bg-ok' : 'bg-text-5')} />

  return (
    <>
      <PageHead label={name} title="Agent" summary="How this workspace's agent works: its model, its skills and the services it may use." />
      <Scroll>
        <Column className="space-y-3 py-4">
          <Card>
            <CardTitle>Model</CardTitle>
            <CardDescription>{state.model}{state.workspace.model ? '' : " · the server's default"}. Keys set on the server: {ready.join(', ') || 'none'}.</CardDescription>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); run(async () => { const r = await api<{ model: string }>(`workspaces/${slug}/model`, { model: model.trim() }); setModel(''); return `This workspace now uses ${r.model}.` }) }}>
              <Input list="models" value={model} onChange={e => setModel(e.target.value)} placeholder="provider/model, e.g. openai/gpt-6.1-sol" />
              <datalist id="models">{MODELS.map(m => <option key={m} value={m} />)}</datalist>
              <Button type="submit">Use</Button>
            </form>
          </Card>
          <Card>
            <CardTitle>Skills</CardTitle>
            <CardDescription>What the agent knows how to do. It reads a skill before using it.</CardDescription>
            {state.skills.length ? state.skills.map(k => <Chip key={k.name} title={k.description}>{k.name}</Chip>) : <span className="text-secondary text-text-4">None yet. Import an Agent Plugin or a skill below.</span>}
          </Card>
          <Card>
            <CardTitle>Connections</CardTitle>
            <CardDescription>MCP servers the agent may use.</CardDescription>
            {state.mcp.running.map(m => <Chip key={m.name}><Dot on />{m.name} · {m.tools} tools</Chip>)}
            {declared.map(n => <Chip key={n}><Dot on={false} />{n} · starts with the next message</Chip>)}
            {!state.mcp.running.length && !declared.length && <span className="text-secondary text-text-4">None yet.</span>}
            {state.mcp.errors.map(e => <div key={e} className="mt-2 text-secondary text-bad">{e}</div>)}
          </Card>
          <Card>
            <CardTitle>Import</CardTitle>
            <CardDescription>An Agent Plugin or a skill folder, on the server's machine. Its skills and MCP servers are added to this workspace.</CardDescription>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (path.trim()) run(async () => { const r = await api<{ imported: string[] }>(`workspaces/${slug}/import`, { path: path.trim() }); setPath(''); return `Imported: ${r.imported.join(', ')}. Servers start with the next message.` }) }}>
              <Input value={path} onChange={e => setPath(e.target.value)} placeholder="/path/to/plugin" />
              <Button type="submit">Import</Button>
            </form>
          </Card>
          <Card>
            <CardTitle>What waits for you</CardTitle>
            <CardDescription>Reads run alone; anything that commits waits for you. Change a tool's class for this workspace only.</CardDescription>
            {classes.length ? classes.map(([t, c]) => <Chip key={t}><span className="font-mono">{t}</span> · {c}</Chip>) : <span className="text-secondary text-text-4">Every tool keeps its own class.</span>}
            <form className="mt-2 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); if (tool.trim()) run(async () => { await api(`workspaces/${slug}/classes`, { tool: tool.trim(), class: cls }); setTool(''); return 'Saved.' }) }}>
              <Input value={tool} onChange={e => setTool(e.target.value)} placeholder="Tool name, e.g. web_fetch" className="min-w-[180px] flex-1" />
              <NativeSelect value={cls} onChange={e => setCls(e.target.value)} className="w-auto min-w-[180px] flex-1">
                <option value="read">read: runs alone</option>
                <option value="reversible">reversible: runs alone</option>
                <option value="commits">commits: waits for you</option>
                <option value="default">back to its default</option>
              </NativeSelect>
              <Button type="submit">Save</Button>
            </form>
          </Card>
          <p className="text-secondary text-text-4">The agent's instructions are in this workspace's <span className="font-mono">agent/AGENTS.md</span>, on the server. Agents cannot change them.</p>
        </Column>
      </Scroll>
    </>
  )
}
