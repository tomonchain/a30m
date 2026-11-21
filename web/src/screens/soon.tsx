import type { LucideIcon } from 'lucide-react'
import { PageHead, Scroll } from '@/components/page'

// A page whose feature is not built yet says so (the project's rule).
export function Soon({ name, title, icon: Icon, what }: { name: string; title: string; icon: LucideIcon; what: string }) {
  return (
    <>
      <PageHead label={name} title={title} />
      <Scroll>
        <div className="mx-auto mt-[14vh] max-w-[460px] text-center">
          <div className="mx-auto mb-3.5 grid size-[52px] place-items-center rounded-2xl bg-raised text-text-3"><Icon className="size-6" strokeWidth={1.8} /></div>
          <span className="mb-2.5 inline-block rounded-full bg-chip px-2.5 py-0.5 text-caption font-semibold text-text-3">In development</span>
          <h2 className="m-0 mb-1.5 text-value font-semibold">{title}</h2>
          <p className="m-0 text-text-4">{what}</p>
        </div>
      </Scroll>
    </>
  )
}

export const SOON_TEXT: Record<string, string> = {
  team: 'The agents you hire for this workspace, in groups, with a lead who hands out the work. You will talk to the lead or to any agent directly.',
  routines: "Recurring work given to an agent: a schedule or an event, an instruction in plain words, and what it may do alone. Created by talking, from an agent's suggestion, or here.",
  files: 'The files your agents write in this workspace, to read, download and restore.',
}
