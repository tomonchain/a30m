import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { colour, initials } from '@/lib/colour'
import { CropDialog } from '@/components/crop-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Logos fetched once per version: every tile and page shows the same one.
const cache = new Map<string, string>()

/** A workspace's logo, or its initials on its colour without one. After
    Airth's Picture. */
export function Logo({ slug, name, version, className }: { slug: string; name: string; version: number | null; className?: string }) {
  const key = `${slug}@${version}`
  const [url, setUrl] = useState<string | null>(version ? cache.get(key) ?? null : null)
  useEffect(() => {
    if (!version) { setUrl(null); return }
    if (cache.has(key)) { setUrl(cache.get(key)!); return }
    let live = true
    api<{ mime: string; data: string }>(`workspaces/${slug}/image`)
      .then(r => { const u = `data:${r.mime};base64,${r.data}`; cache.set(key, u); if (live) setUrl(u) })
      .catch(() => {})
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [bg, fg] = colour(slug)
  return (
    <span className={cn('grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl text-base font-bold', className)} style={url ? undefined : { background: bg, color: fg }}>
      {url ? <img src={url} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  )
}

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((ok, fail) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.onerror = () => fail(r.error)
    r.readAsDataURL(b)
  })
}

/** Picked, framed in a dialog (moved and zoomed), then saved. Airth's
    PictureEditor, sending the picture inside JSON. */
export function LogoEditor({ slug, name, version, onDone }: { slug: string; name: string; version: number | null; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<File | null>(null)
  async function save(b: Blob) {
    try { await api(`workspaces/${slug}/image`, { data: await blobToBase64(b) }); toast.success('Logo saved.'); onDone(); return true }
    catch (e) { toast.error((e as Error).message); return false }
  }
  async function remove() {
    try { await api(`workspaces/${slug}/image/remove`, {}); toast.success('Logo removed.'); onDone() }
    catch (e) { toast.error((e as Error).message) }
  }
  return (
    <div className="flex items-center gap-3">
      <Logo slug={slug} name={name} version={version} className="size-14" />
      <Button size="sm" variant="outline" onClick={() => input.current?.click()}>{version ? 'Change logo' : 'Add a logo'}</Button>
      {version && <Button size="sm" variant="ghost" onClick={remove}>Remove</Button>}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setPicked(f) }} />
      <CropDialog file={picked} onCancel={() => setPicked(null)} onSave={async b => { if (await save(b)) setPicked(null) }} />
    </div>
  )
}
