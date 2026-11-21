import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, FileText, Folder } from 'lucide-react'
import { api } from '@/lib/api'
import { Column, Empty, PageHead, Scroll } from '@/components/page'
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
      <>
        <PageHead label={name} title={open.path.split('/').pop() || open.path} summary={open.path} actions={<Button variant="ghost" onClick={() => setOpen(null)}>Back to files</Button>} />
        <Scroll>
          <Column className="py-4">
            {open.path.endsWith('.md')
              ? <Markdown text={open.text} />
              : <pre className="overflow-auto rounded-[10px] border border-line bg-card px-3 py-2.5 font-mono text-secondary whitespace-pre-wrap text-text-2">{open.text}</pre>}
          </Column>
        </Scroll>
      </>
    )
  }

  return (
    <>
      <PageHead label={name} title="Files" summary="What the agents wrote in this workspace. Read only." />
      <Scroll>
        <Column className="py-4">
          <div className="mb-3 flex flex-wrap items-center gap-1 text-secondary text-text-3">
            <button type="button" className="cursor-pointer rounded-md px-1.5 py-0.5 hover:bg-raised hover:text-text" onClick={() => setPath('')}>Files</button>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="size-3.5" />
                <button type="button" className="cursor-pointer rounded-md px-1.5 py-0.5 hover:bg-raised hover:text-text" onClick={() => setPath(crumbs.slice(0, i + 1).join('/'))}>{c}</button>
              </span>
            ))}
          </div>
          {error && <div className="mb-3 text-secondary text-bad">{error}</div>}
          {entries && !entries.length && <Empty title="No files yet">Files your agents write in this workspace appear here.</Empty>}
          {entries && entries.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              {entries.map((e, i) => (
                <button key={e.name} type="button" onClick={() => e.dir ? setPath(into(e.name)) : view(into(e.name))}
                  className={cn('flex min-h-11 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 text-left hover:bg-raised', i > 0 && 'border-t border-line-soft')}>
                  {e.dir ? <Folder className="size-[18px] shrink-0 text-text-3" strokeWidth={1.8} /> : <FileText className="size-[18px] shrink-0 text-text-3" strokeWidth={1.8} />}
                  <span className="min-w-0 flex-1 truncate text-text">{e.name}</span>
                  {!e.dir && <span className="shrink-0 text-xs2 text-text-4 max-[720px]:hidden">{when(e.modified)}</span>}
                  {!e.dir && <span className="w-16 shrink-0 text-right text-xs2 text-text-4">{size(e.size)}</span>}
                </button>
              ))}
            </div>
          )}
        </Column>
      </Scroll>
    </>
  )
}
