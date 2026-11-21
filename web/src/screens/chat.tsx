import { useLayoutEffect, useRef, useState } from 'react'
import { MessageSquarePlus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Block, type WorkspaceState } from '@/lib/api'
import { says } from '@/lib/says'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Markdown } from '@/components/markdown'
import { ApprovalCard } from '@/components/approval'
import { TOOL_ICONS } from '@/components/icons'
import { Column, Empty, PageHead, Pill, Scroll } from '@/components/page'

type Result = Extract<Block, { type: 'tool_result' }>

export function Chat({ slug, name, state, refresh }: { slug: string; name: string; state: WorkspaceState; refresh: () => void }) {
  const [text, setText] = useState('')
  const [confirm, setConfirm] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
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

  const rows: React.ReactNode[] = []
  let last: string = 'user'
  state.messages.forEach((m, mi) => m.content.forEach((b, bi) => {
    const key = `${mi}.${bi}`
    const shows = b.type === 'tool_use' || (b.type === 'text' && b.text.trim())
    if (m.role === 'assistant' && shows && last !== 'assistant') {
      rows.push(<div key={key + 'w'} className="mt-5 -mb-1.5 flex items-center gap-2 text-secondary font-semibold text-text-3"><span className="grid size-6 place-items-center rounded-[7px] bg-[#4FCB8F] text-[#08261A]"><Sparkles className="size-3.5" strokeWidth={2.2} /></span>a30m</div>)
      last = 'assistant'
    }
    if (m.role === 'user' && b.type === 'text') last = 'user'
    if (b.type === 'text' && b.text.trim()) {
      rows.push(m.role === 'user'
        ? <div key={key} className="my-4 ml-auto w-fit max-w-[78%] rounded-[14px] border border-line bg-card px-3.5 py-2.5 whitespace-pre-wrap text-text [overflow-wrap:anywhere] max-[720px]:max-w-[88%]">{b.text}</div>
        : <div key={key} className="my-4"><Markdown text={b.text} /></div>)
    }
    if (b.type === 'tool_use') {
      const r = results[b.id]
      const said = says(b.name, b.input)
      const Icon = TOOL_ICONS[said.icon]
      rows.push(
        <details key={b.id} className={cn('group my-1 text-secondary text-text-4', r?.is_error && 'text-bad')}>
          <summary className="flex cursor-pointer list-none items-center gap-2 py-0.5 [&::-webkit-details-marker]:hidden">
            <Icon className="size-[15px] shrink-0" strokeWidth={1.8} />
            <span className="truncate">{said.text}{!r && ' …'}{r?.is_error && ' · failed'}</span>
          </summary>
          <pre className="my-1.5 max-h-72 overflow-auto rounded-[10px] border border-line bg-card px-2.5 py-2 font-mono whitespace-pre-wrap text-text-3">{JSON.stringify(b.input, null, 2)}</pre>
          {r && <pre className="my-1.5 max-h-72 overflow-auto rounded-[10px] border border-line bg-card px-2.5 py-2 font-mono whitespace-pre-wrap text-text-3">{r.content}</pre>}
        </details>,
      )
    }
  }))

  const status = state.waiting.length ? <Pill tone="wait">Waiting for you</Pill> : state.running ? <Pill tone="run">Working</Pill> : null

  return (
    <>
      <PageHead label={name} title="Chat" summary={status} actions={
        <Button variant="ghost" disabled={state.running || !state.messages.length} onClick={() => setConfirm(true)} title="Start a new conversation; this one is kept">
          <MessageSquarePlus /><span className="max-[720px]:hidden">New conversation</span>
        </Button>
      } />
      <Scroll ref={scroller} onScroll={onScroll}>
        <Column>
          {!state.messages.length && <Empty title="What should a30m do here?">Ask in plain words. Anything that sends, pays, publishes or reaches outside waits for you.</Empty>}
          {rows}
          {state.waiting.map(a => <ApprovalCard key={a.id} a={a} onDone={refresh} />)}
          {state.running && !state.waiting.length && (
            <div className="my-3 flex items-center gap-2 text-secondary text-text-4"><span className="size-[7px] animate-[pulse-dot_1.2s_infinite] rounded-full bg-ok" />Working…</div>
          )}
          {state.error && <div className="my-2.5 text-secondary text-bad">{state.error}</div>}
        </Column>
      </Scroll>
      <form className="px-8 pt-3 pb-5 max-[720px]:px-3 max-[720px]:pt-2 max-[720px]:pb-[max(12px,env(safe-area-inset-bottom))]" onSubmit={e => { e.preventDefault(); send() }}>
        <Column className="flex items-end gap-2 rounded-[14px] border border-line bg-card py-1.5 pr-1.5 pl-1">
          <Textarea rows={1} value={text} placeholder="Ask a30m…" className="max-h-[200px] border-0 bg-transparent field-sizing-content"
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }} />
          <Button variant="primary" type="submit" disabled={state.running || !text.trim()}>Send</Button>
        </Column>
      </form>
      <Dialog open={confirm} onOpenChange={setConfirm} title="Start a new conversation?" description="This one is kept on the server, but the agent will no longer see it.">
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button variant="primary" onClick={async () => {
            try { await api(`workspaces/${slug}/conversation/new`, {}); setConfirm(false); refresh() } catch (e) { toast.error((e as Error).message) }
          }}>New conversation</Button>
        </div>
      </Dialog>
    </>
  )
}
