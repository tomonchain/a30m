import type { WorkspaceState } from '@/lib/api'
import { ApprovalCard } from '@/components/approval'
import { Column, Empty, PageHead, Scroll } from '@/components/page'

export function NeedsYou({ name, state, refresh }: { name: string; state: WorkspaceState; refresh: () => void }) {
  const w = state.waiting
  return (
    <>
      <PageHead label={name} title="Needs you" summary={w.length ? `${w.length} waiting` : ''} />
      <Scroll>
        <Column>
          {w.length
            ? w.map(a => <ApprovalCard key={a.id} a={a} onDone={refresh} />)
            : <Empty title="Nothing waits for you">When an agent wants to send, pay, publish or reach outside, it asks here first.</Empty>}
        </Column>
      </Scroll>
    </>
  )
}
