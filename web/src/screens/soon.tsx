import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Page, Panel } from '@/components/page'

// A page whose feature is not built yet says so (the project's rule).
export function Soon({ name, title, icon: Icon, what }: { name: string; title: string; icon: LucideIcon; what: string }) {
  return (
    <Page eyebrow={name} title={title}>
      <Panel className="flex flex-col items-center px-6 py-12 text-center">
        <Icon className="size-8 text-muted-foreground/60" strokeWidth={1.6} />
        <Badge variant="secondary" className="mt-4">In development</Badge>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">{what}</p>
      </Panel>
    </Page>
  )
}

export const SOON_TEXT: Record<string, string> = {
  team: 'The agents you hire for this workspace, in groups, with a lead who hands out the work. You will talk to the lead or to any agent directly.',
  routines: "Recurring work given to an agent: a schedule or an event, an instruction in plain words, and what it may do alone. Created by talking, from an agent's suggestion, or here.",
}
