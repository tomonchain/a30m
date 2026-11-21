import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react'
import { api } from '@/lib/api'
import { Empty, Page, Panel } from '@/components/page'
import { Markdown } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Entry = { name: string; dir: boolean; size: number; modified: number | null }

const size = (n: number) => n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`
const when = (s: number | null) => s ? new Date(s * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''

// What the agents wrote in this workspace's folder, read only.
export function Files({ slug, name, tick }: { slug: string; name: string; tick: number }) {
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [open, setOpen] = useState<{ path: string; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (p: string) => {
    try {
      const r = await api<{ entries: Entry[] }>(`workspaces/${slug}/files`, { path: p })
      setEntries(r.entries); setError(null)
    } catch (e) { setError((e as Error).message) }
  }, [slug])

  useEffect(() => { load(path) }, [load, path, tick])

  const view = async (p: string) => {
    try { setOpen(await api<{ path: string; text: string }>(`workspaces/${slug}/file`, { path: p })) }
    catch (e) { setError((e as Error).message) }
  }

  const crumbs = path ? path.split('/') : []
  const into = (n: string) => (path ? `${path}/${n}` : n)

  if (open) {
    return (
      <Page eyebrow={open.path} title={open.path.split('/').pop() || open.path} actions={<Button variant="outline" onClick={() => setOpen(null)}>Back to files</Button>}>
        {open.path.endsWith('.md')
          ? <Markdown text={open.text} />
          : <pre className="overflow-auto rounded-xl bg-bubble px-3 py-2.5 font-mono text-xs whitespace-pre-wrap">{open.text}</pre>}
      </Page>
    )
  }

  return (
    <Page eyebrow={name} title="Files" lede="What the agents wrote in this workspace. Read only.">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-0.5 text-sm text-muted-foreground">
          <button type="button" className="rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-foreground" onClick={() => setPath('')}>Files</button>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <ChevronRight className="size-3.5" />
              <button type="button" className="rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-foreground" onClick={() => setPath(crumbs.slice(0, i + 1).join('/'))}>{c}</button>
            </span>
          ))}
        </div>
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        {entries && !entries.length && <Empty icon={FolderOpen} title="No files yet">Files your agents write in this workspace appear here.</Empty>}
        {entries && entries.length > 0 && (
          <Panel className="overflow-hidden p-1">
            {entries.map(e => (
              <button key={e.name} type="button" onClick={() => e.dir ? setPath(into(e.name)) : view(into(e.name))}
                className={cn('flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors hover:bg-accent')}>
                {e.dir ? <Folder className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.8} /> : <FileText className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.8} />}
                <span className="min-w-0 flex-1 truncate text-sm">{e.name}</span>
                {!e.dir && <span className="shrink-0 text-xs text-muted-foreground max-md:hidden">{when(e.modified)}</span>}
                {!e.dir && <span className="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{size(e.size)}</span>}
              </button>
            ))}
          </Panel>
        )}
      </div>
    </Page>
  )
}
