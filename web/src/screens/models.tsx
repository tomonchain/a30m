import { useState } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConnectModel, sourceText, useProviders } from '@/components/connect'
import { Column, PageHead, Scroll } from '@/components/page'
import { cn } from '@/lib/utils'

// Settings > Models: the workspace's own keys and model (decision 167).
export function Models({ slug, name, refresh }: { slug: string; name: string; refresh: () => void }) {
  const { providers, model, reload } = useProviders(slug)
  const [searchKey, setSearchKey] = useState('')
  const [busy, setBusy] = useState(false)
  const search = providers?.find(p => p.kind === 'search')
  const keys = providers?.filter(p => p.source === 'workspace') ?? []

  const setKey = async (provider: string, key: string, done: string) => {
    setBusy(true)
    try { await api(`workspaces/${slug}/providers/${provider}`, { key }); toast.success(done); await reload(); refresh() }
    catch (e) { toast.error((e as Error).message) }
    setBusy(false)
  }

  return (
    <>
      <PageHead label={name} title="Models" summary="The models this workspace uses, with its own keys. Another workspace never uses them." />
      <Scroll>
        <Column className="space-y-3 py-4">
          <Card>
            <CardTitle>Model</CardTitle>
            <CardDescription>This workspace uses <span className="font-mono text-text-2">{model || '…'}</span>. Choose a provider, connect it, then choose a model.</CardDescription>
            <ConnectModel key={slug} slug={slug} onDone={() => { reload(); refresh() }} />
          </Card>
          <Card>
            <CardTitle>Web search</CardTitle>
            <CardDescription>Lets agents search the web, through Brave Search. Reading a page needs no key.</CardDescription>
            {search && (
              <>
                <div className={cn('mb-2 text-secondary', search.source ? 'text-ok' : 'text-text-4')}>{sourceText(search)}</div>
                <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (searchKey.trim()) setKey('brave', searchKey.trim(), 'Web search connected.').then(() => setSearchKey('')) }}>
                  <Input type="password" autoComplete="off" spellCheck={false} value={searchKey} onChange={e => setSearchKey(e.target.value)} placeholder="Brave Search key" className="font-mono" />
                  <Button type="submit" disabled={busy || !searchKey.trim()}>Connect</Button>
                </form>
                <a href={search.key_url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs2 text-accent hover:text-accent-hover">Get a key <ExternalLink className="size-3.5" /></a>
              </>
            )}
          </Card>
          <Card>
            <CardTitle>This workspace's keys</CardTitle>
            <CardDescription>Kept on your server, readable by the server alone, never shown again. Without its own key, a workspace uses the server's, if it has one.</CardDescription>
            {!keys.length && <span className="text-secondary text-text-4">None yet.</span>}
            {keys.map(p => (
              <div key={p.name} className="flex items-center gap-3 border-t border-line-soft py-2 first-of-type:border-t-0">
                <span className="flex-1 text-text">{p.label}</span>
                <span className="font-mono text-xs2 text-text-4">{p.hint}</span>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => setKey(p.name, '', `${p.label}: this workspace's key removed.`)} title="Remove this workspace's key"><Trash2 />Remove</Button>
              </div>
            ))}
          </Card>
        </Column>
      </Scroll>
    </>
  )
}
