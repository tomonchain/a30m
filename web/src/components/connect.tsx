import { useEffect, useState } from 'react'
import { Check, ExternalLink, KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Provider } from '@/lib/api'
import { preferred } from '@/lib/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export function useProviders(slug: string) {
  const [providers, setProviders] = useState<Provider[] | null>(null)
  const [model, setModel] = useState('')
  const load = async () => {
    try {
      const r = await api<{ providers: Provider[]; model: string }>(`workspaces/${slug}/providers`)
      setProviders(r.providers); setModel(r.model)
    } catch (e) { toast.error((e as Error).message) }
  }
  useEffect(() => { load() }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps
  return { providers, model, reload: load }
}

export function sourceText(p: Provider): string {
  if (p.source === 'workspace') return `Connected · ${p.hint}`
  if (p.source === 'server') return `From the server · ${p.hint}`
  if (p.source === 'local') return 'No key needed'
  return 'Not connected'
}

const usable = (p: Provider) => p.source !== null

/** Pick a provider, paste its key (a30m tries it first), choose a model. */
export function ConnectModel({ slug, onDone }: { slug: string; onDone?: (model: string) => void }) {
  const { providers, model, reload } = useProviders(slug)
  const [chosen, setChosen] = useState('')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [models, setModels] = useState<string[] | null>(null)
  const [pick, setPick] = useState('')
  const list = providers?.filter(p => p.kind === 'model') ?? []
  const current = list.find(p => p.name === chosen)

  useEffect(() => {
    if (!chosen && list.length) {
      // The provider in use first, then one already connected.
      const inUse = list.find(p => model.startsWith(p.name + '/') && p.source)
      const first = inUse ?? list.find(p => p.source === 'workspace' || p.source === 'server')
      setChosen(first ? first.name : 'anthropic')
    }
  }, [providers]) // eslint-disable-line react-hooks/exhaustive-deps

  // A provider that works already: list its models straight away.
  useEffect(() => {
    setModels(null); setPick(''); setKey('')
    if (!current || !usable(current)) return
    api<{ models: string[] }>(`workspaces/${slug}/providers/${current.name}/models`, {})
      .then(r => { setModels(r.models); setPick(preferred(current.name, r.models, model)) })
      .catch(e => { setModels([]); toast.error((e as Error).message) })
  }, [chosen, current?.source]) // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async () => {
    if (!current || !key.trim()) return
    setBusy(true)
    try {
      const r = await api<{ models: string[] }>(`workspaces/${slug}/providers/${current.name}`, { key: key.trim() })
      setKey(''); toast.success(`${current.label} connected.`)
      await reload()
      setModels(r.models); setPick(preferred(current.name, r.models, model))
    } catch (e) { toast.error((e as Error).message) }
    setBusy(false)
  }
  const use = async () => {
    if (!current || !pick) return
    setBusy(true)
    try {
      const r = await api<{ model: string }>(`workspaces/${slug}/model`, { model: `${current.name}/${pick}` })
      toast.success(`This workspace now uses ${r.model}.`)
      await reload()
      onDone?.(r.model)
    } catch (e) { toast.error((e as Error).message) }
    setBusy(false)
  }

  if (!providers) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {list.map(p => (
          <button key={p.name} type="button" onClick={() => setChosen(p.name)}
            className={cn('flex flex-col items-start gap-1 rounded-xl bg-bubble px-3 py-2.5 text-left ring-1 transition-colors',
              chosen === p.name ? 'ring-foreground/60' : 'ring-transparent hover:ring-foreground/15')}>
            <span className="text-sm font-medium">{p.label}</span>
            <span className={cn('flex items-center gap-1 text-xs', usable(p) ? 'text-emerald-500' : 'text-muted-foreground')}>
              {usable(p) && <Check className="size-3.5" />}{sourceText(p)}
            </span>
          </button>
        ))}
      </div>
      {current?.needs_key && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">{current.source ? `Replace the key for ${current.label}` : `Paste a key for ${current.label}`}</span>
            <a href={current.key_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-500 hover:underline">Get a key <ExternalLink className="size-3.5" /></a>
          </div>
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); connect() }}>
            <div className="relative flex-1">
              <KeyRound className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" autoComplete="off" spellCheck={false} value={key} onChange={e => setKey(e.target.value)} placeholder="Key" className="h-9 pl-8 font-mono" />
            </div>
            <Button type="submit" variant="outline" size="lg" disabled={busy || !key.trim()}>{busy && <Loader2 className="animate-spin" />}Connect</Button>
          </form>
          <p className="text-xs text-muted-foreground">a30m tries the key before keeping it. It stays on your server, for this workspace only, and is never shown again.</p>
        </div>
      )}
      {current && !current.needs_key && (
        <p className="text-sm text-muted-foreground">Ollama runs models on the server itself. {models && !models.length ? 'No model found: install Ollama on the server and pull a model (ollama pull llama3.3).' : ''}</p>
      )}
      {models && models.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-sm font-medium">Model</div>
          <div className="flex gap-2">
            <Select value={pick} onValueChange={v => setPick(String(v))}>
              <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>{models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="lg" disabled={busy || !pick} onClick={use}>Use this model</Button>
          </div>
        </div>
      )}
    </div>
  )
}
