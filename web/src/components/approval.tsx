import { useState } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Approval } from '@/lib/api'
import { approving, says } from '@/lib/says'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// One thing an agent waits on, after Airth's NeedCard: what it wants, what
// approving does, then Approve, or Refuse with a reason.
export function ApprovalCard({ a, onDone }: { a: Approval; onDone: () => void }) {
  const [why, setWhy] = useState('')
  const [refusing, setRefusing] = useState(false)
  const [busy, setBusy] = useState(false)
  const said = says(a.tool, a.input)
  const answer = async (approve: boolean) => {
    setBusy(true)
    try {
      await api('approvals/' + a.id, { approve, reason: approve ? '' : why })
      toast.success(approve ? 'Approved.' : 'Refused.')
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
      setBusy(false)
    }
  }
  return (
    <div className="my-4 rounded-xl bg-bubble p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-500"><Send className="size-3.5" />To approve</span>
        <span className="text-xs text-muted-foreground">{a.class}</span>
      </div>
      <p className="mt-2.5 text-[15px] font-medium break-words">{said.text}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{approving(a.tool)}</p>
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">Details</summary>
        <pre className="mt-1.5 max-h-56 overflow-auto rounded-lg bg-background/60 p-2 font-mono whitespace-pre-wrap">{a.tool}{'\n'}{JSON.stringify(a.input, null, 2)}</pre>
      </details>
      {refusing ? (
        <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); answer(false) }}>
          <Input autoFocus value={why} onChange={e => setWhy(e.target.value)} placeholder="Why not? The agent reads it." className="h-9" />
          <Button type="submit" variant="destructive" size="lg" disabled={busy}>Refuse</Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => setRefusing(false)}>Cancel</Button>
        </form>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button size="lg" disabled={busy} onClick={() => answer(true)}>Approve</Button>
          <Button size="lg" variant="ghost" disabled={busy} onClick={() => setRefusing(true)}>Refuse…</Button>
        </div>
      )}
    </div>
  )
}
