import { Bell } from 'lucide-react'
import type { WorkspaceState } from '@/lib/api'
import { ApprovalCard } from '@/components/approval'
import { Empty, Page } from '@/components/page'

export function NeedsYou({ name, state, refresh }: { name: string; state: WorkspaceState; refresh: () => void }) {
  const w = state.waiting
  return (
    <Page eyebrow={name} title="Needs you" lede={w.length ? `${w.length} waiting for your answer.` : 'What your agents ask before they act.'}>
      <div>
        {w.length
          ? w.map(a => <ApprovalCard key={a.id} a={a} onDone={refresh} />)
          : <Empty icon={Bell} title="Nothing waits for you">When an agent wants to send, pay, publish or reach outside, it asks here first.</Empty>}
      </div>
    </Page>
  )
}
