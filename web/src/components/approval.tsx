import { useState } from 'react'
import { Bell } from 'lucide-react'
import { api, type Approval } from '@/lib/api'
import { approving, says } from '@/lib/says'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

// DESIGN.md's approval card: what the agent wants, what approving does,
// then Approve, or Refuse with a reason.
export function ApprovalCard({ a, onDone }: { a: Approval; onDone: () => void }) {
  const [why, setWhy] = useState('')
  const [busy, setBusy] = useState(false)
  const said = says(a.tool, a.input)
  const answer = async (approve: boolean) => {
    setBusy(true)
    try {
      await api('approvals/' + a.id, { approve, reason: approve ? '' : why })
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
      setBusy(false)
    }
  }
  return (
    <div className="my-3.5 rounded-2xl border border-warn bg-warn-bg px-4 py-3.5">
      <div className="flex items-center gap-2 text-caption font-semibold tracking-[.04em] text-warn uppercase">
        <Bell className="size-4" /> Needs you · {a.class}
      </div>
      <div className="mt-2 text-card-title break-words text-text">The agent wants to: {said.text.charAt(0).toLowerCase() + said.text.slice(1)}</div>
      <div className="text-secondary text-warn-muted">{approving(a.tool)}</div>
      <details className="mt-2 mb-2.5 text-secondary text-text-4">
        <summary className="cursor-pointer">Details</summary>
        <pre className="mt-1.5 max-h-56 overflow-auto font-mono whitespace-pre-wrap text-text-3">{a.tool}{'\n'}{JSON.stringify(a.input, null, 2)}</pre>
      </details>
      <div className="flex items-center gap-2 max-[720px]:flex-wrap">
        <Button variant="primary" disabled={busy} onClick={() => answer(true)}>Approve</Button>
        <Input value={why} onChange={e => setWhy(e.target.value)} placeholder="Why not? (optional)" className="flex-1 bg-panel max-[720px]:order-3 max-[720px]:basis-full" />
        <Button variant="danger" disabled={busy} onClick={() => answer(false)}>Refuse</Button>
      </div>
    </div>
  )
}
