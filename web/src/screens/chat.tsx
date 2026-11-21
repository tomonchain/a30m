import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowUp, MessageSquarePlus, Sparkles, Square } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Block, type WorkspaceState } from '@/lib/api'
import { says } from '@/lib/says'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Markdown } from '@/components/markdown'
import { ApprovalCard } from '@/components/approval'
import { TOOL_ICONS } from '@/components/icons'
import { Pill } from '@/components/page'

type Result = Extract<Block, { type: 'tool_result' }>

const SUGGESTIONS = [
  'Plan a weekend for two in Lisbon and write it in a file',
  'Read a web page and summarise it in five points',
  'Draft a polite email declining a meeting',
]

export function Chat({ slug, name, state, refresh, onSettings }: { slug: string; name: string; state: WorkspaceState; refresh: () => void; onSettings: () => void }) {
  const [text, setText] = useState('')
  const [confirm, setConfirm] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const stick = useRef(true)

  const results: Record<string, Result> = {}
  for (const m of state.messages) for (const b of m.content) if (b.type === 'tool_result') results[b.tool_use_id] = b

  // Follow new content while the owner is at the bottom.
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  })
  const onScroll = () => {
    const el = scroller.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const send = async () => {
    const t = text.trim()
    if (!t || state.running) return
    try {
      await api(`workspaces/${slug}/messages`, { text: t })
      setText('')
      stick.current = true
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const stop = async () => {
    try { await api(`workspaces/${slug}/stop`, {}); toast('Stopping the agent.'); refresh() } catch (e) { toast.error((e as Error).message) }
  }

  const rows: React.ReactNode[] = []
  let last = 'user'
  state.messages.forEach((m, mi) => m.content.forEach((b, bi) => {
    const key = `${mi}.${bi}`
    const shows = b.type === 'tool_use' || (b.type === 'text' && b.text.trim())
    if (m.role === 'assistant' && shows && last !== 'assistant') {
      rows.push(
        <div key={key + 'w'} className="mt-6 mb-1.5 flex items-center gap-2 text-sm font-medium">
          <span className="grid size-6 place-items-center rounded-lg bg-foreground text-background"><Sparkles className="size-3.5" strokeWidth={2.2} /></span>a30m
        </div>,
      )
      last = 'assistant'
    }
    if (m.role === 'user' && b.type === 'text') last = 'user'
    if (b.type === 'text' && b.text.trim()) {
      rows.push(m.role === 'user'
        ? <div key={key} className="my-4 ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-me px-3.5 py-2 whitespace-pre-wrap text-me-foreground [overflow-wrap:anywhere]">{b.text}</div>
        : <div key={key} className="my-2"><Markdown text={b.text} /></div>)
    }
    if (b.type === 'tool_use') {
      const r = results[b.id]
      const said = says(b.name, b.input)
      const Icon = TOOL_ICONS[said.icon]
      rows.push(
        <details key={b.id} className={cn('group my-1 text-sm text-muted-foreground', r?.is_error && 'text-red-500')}>
          <summary className="flex cursor-pointer list-none items-center gap-2 py-0.5 hover:text-foreground [&::-webkit-details-marker]:hidden">
            <Icon className="size-4 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{said.text}{!r && ' …'}{r?.is_error && ' · failed'}</span>
          </summary>
          <pre className="my-1.5 max-h-72 overflow-auto rounded-xl bg-bubble px-3 py-2 font-mono text-xs whitespace-pre-wrap">{JSON.stringify(b.input, null, 2)}</pre>
          {r && <pre className="my-1.5 max-h-72 overflow-auto rounded-xl bg-bubble px-3 py-2 font-mono text-xs whitespace-pre-wrap">{r.content}</pre>}
        </details>,
      )
    }
  }))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 px-5 max-md:px-3">
        <h1 className="truncate text-[15px] font-semibold">{name}</h1>
        {state.waiting.length ? <Pill tone="wait">Waiting for you</Pill> : state.running ? <Pill tone="run">Working</Pill> : null}
        <span className="flex-1" />
        {state.running && <Button variant="destructive" onClick={stop} title="Stop the agent: what waits for you is refused, nothing more runs"><Square />Stop</Button>}
        <Button variant="ghost" disabled={state.running || !state.messages.length} onClick={() => setConfirm(true)} title="Start a new conversation; this one is kept">
          <MessageSquarePlus /><span className="max-md:hidden">New conversation</span>
        </Button>
      </header>
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-5 max-md:px-4">
        <div className="mx-auto max-w-3xl pb-6">
          {!state.model_ready && (
            <div className="my-4 flex items-center gap-3 rounded-xl bg-amber-500/10 px-4 py-3 text-sm">
              <span className="flex-1">No model is connected to this workspace yet.</span>
              <Button onClick={onSettings}>Connect a model</Button>
            </div>
          )}
          {!state.messages.length && (
            <div className="mx-auto mt-[14vh] max-w-md text-center">
              <h2 className="text-2xl font-semibold tracking-tight">What should a30m do?</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Ask in plain words. Anything that sends, pays, publishes or reaches outside waits for you.</p>
              <div className="mt-6 flex flex-col items-center gap-2">
                {SUGGESTIONS.map(s => (
                  <button key={s} type="button" onClick={() => { setText(s); box.current?.focus() }}
                    className="rounded-full bg-bubble px-3.5 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-foreground">{s}</button>
                ))}
              </div>
            </div>
          )}
          {rows}
          {state.waiting.map(a => <ApprovalCard key={a.id} a={a} onDone={refresh} />)}
          {state.running && !state.waiting.length && (
            <div className="my-3 flex items-center gap-2 text-sm text-muted-foreground"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />Working…</div>
          )}
          {state.error && <div className="my-3 text-sm text-red-500">{state.error}</div>}
        </div>
      </div>
      <form className="shrink-0 px-5 pt-2 pb-5 max-md:px-3 max-md:pb-[max(12px,env(safe-area-inset-bottom))]" onSubmit={e => { e.preventDefault(); send() }}>
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl bg-bubble p-2 ring-1 ring-foreground/5 focus-within:ring-foreground/15">
          <Textarea ref={box} rows={1} value={text} placeholder={`Ask a30m in ${name}…`}
            className="max-h-[200px] min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }} />
          <Button type="submit" size="icon-lg" className="rounded-full" disabled={state.running || !text.trim()} aria-label="Send"><ArrowUp /></Button>
        </div>
      </form>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new conversation?</DialogTitle>
            <DialogDescription>This one is kept on the server, but the agent will no longer see it.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button onClick={async () => {
              try { await api(`workspaces/${slug}/conversation/new`, {}); setConfirm(false); refresh() } catch (e) { toast.error((e as Error).message) }
            }}>New conversation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
