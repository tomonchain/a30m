import { Bell, Bot, Cpu, Folder, MessageSquare, Moon, Plus, Repeat, Sparkles, Sun, Users, type LucideIcon } from 'lucide-react'
import type { WorkspaceState, WorkspaceSummary } from '@/lib/api'
import { colour, initials } from '@/lib/colour'
import { cn } from '@/lib/utils'

export type Page = 'chat' | 'needs' | 'team' | 'routines' | 'files' | 'models' | 'agent'

export const PAGES: { id: Page; label: string; icon: LucideIcon; soon?: boolean; group: 'top' | 'work' | 'settings' }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare, group: 'top' },
  { id: 'needs', label: 'Needs you', icon: Bell, group: 'top' },
  { id: 'team', label: 'Team', icon: Users, soon: true, group: 'work' },
  { id: 'routines', label: 'Routines', icon: Repeat, soon: true, group: 'work' },
  { id: 'files', label: 'Files', icon: Folder, group: 'work' },
  { id: 'models', label: 'Models', icon: Cpu, group: 'settings' },
  { id: 'agent', label: 'Agent', icon: Bot, group: 'settings' },
]

const tile = 'relative grid size-12 shrink-0 cursor-pointer place-items-center rounded-2xl border-0 p-0 text-[16px] font-bold transition-[border-radius] hover:rounded-xl max-[720px]:size-[42px]'

// The workspaces, one tile each, as Discord shows its servers.
export function SpacesBar({
  list, current, onPick, onAdd, theme, onTheme,
}: {
  list: WorkspaceSummary[]; current: string; onPick: (slug: string) => void; onAdd: () => void
  theme: 'dark' | 'light'; onTheme: () => void
}) {
  return (
    <nav aria-label="Workspaces" className="flex w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto py-3 max-[720px]:w-auto max-[720px]:flex-row max-[720px]:overflow-x-auto max-[720px]:overflow-y-hidden max-[720px]:px-3 max-[720px]:pt-[max(8px,env(safe-area-inset-top))] max-[720px]:pb-2">
      <div className={cn(tile, 'cursor-default bg-raised text-text hover:rounded-2xl')} title="a30m"><Sparkles className="size-5" /></div>
      <div className="h-0.5 w-8 rounded bg-line max-[720px]:h-8 max-[720px]:w-0.5" />
      {list.map(w => {
        const [bg, fg] = colour(w.slug)
        const on = w.slug === current
        return (
          <button key={w.slug} type="button" title={w.name} aria-current={on} onClick={() => onPick(w.slug)}
            className={cn(tile, 'group', on && 'rounded-xl max-[720px]:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--text)]')} style={{ background: bg, color: fg }}>
            <span className={cn('absolute -left-3 w-1 rounded-r bg-text transition-[height] max-[720px]:hidden', on ? 'h-9' : 'h-0 group-hover:h-5')} />
            {initials(w.name)}
            {(w.waiting > 0 || w.running) && (
              <span title={w.waiting ? 'Needs you' : 'Working'} className={cn('absolute -right-[3px] -bottom-[3px] size-3.5 rounded-full border-[3px] border-bg', w.waiting ? 'bg-warn' : 'bg-ok')} />
            )}
          </button>
        )
      })}
      <button type="button" title="New workspace" onClick={onAdd} className={cn(tile, 'border border-dashed border-line bg-card text-ok')}><Plus className="size-5" /></button>
      <span className="flex-1 max-[720px]:hidden" />
      <button type="button" title="Light or dark" onClick={onTheme} className={cn(tile, 'bg-raised text-text-3 hover:text-text max-[720px]:hidden')}>
        {theme === 'light' ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
      </button>
    </nav>
  )
}

// The open workspace's menu, next to the bar.
export function Menu({ name, state, page, onPage }: { name: string; state: WorkspaceState | null; page: Page; onPage: (p: Page) => void }) {
  const waiting = state?.waiting.length ?? 0
  const status = waiting ? 'Waiting for you' : state?.running ? 'Working' : 'Idle'
  const item = (p: (typeof PAGES)[number]) => (
    <button key={p.id} type="button" onClick={() => onPage(p.id)} aria-current={page === p.id}
      className={cn('flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-3 text-left text-text-3 hover:bg-raised hover:text-text-2 max-[720px]:w-auto max-[720px]:shrink-0',
        page === p.id && 'bg-raised text-text hover:text-text')}>
      <p.icon className="size-[18px] shrink-0" strokeWidth={1.8} />
      <span>{p.label}</span>
      {p.id === 'needs' && waiting > 0 && <span className="ml-auto rounded-full bg-warn-chip px-[7px] py-px text-small font-bold text-warn">{waiting}</span>}
      {p.soon && <span className="ml-auto text-small text-text-5 max-[720px]:hidden">Soon</span>}
    </button>
  )
  const label = (text: string) => <div className="mx-3 mt-3.5 mb-1.5 text-caption font-semibold tracking-[.04em] text-text-3 uppercase max-[720px]:hidden">{text}</div>
  return (
    <nav aria-label="Workspace menu" className="flex w-[232px] shrink-0 flex-col gap-0.5 pt-4 pr-2.5 pb-3 pl-1 max-[720px]:w-auto max-[720px]:flex-row max-[720px]:overflow-x-auto max-[720px]:px-2 max-[720px]:pt-0 max-[720px]:pb-1.5">
      <div className="truncate px-3 pt-1.5 text-card-title font-semibold max-[720px]:hidden">{name}</div>
      <div className="truncate px-3 pb-3 text-xs2 text-text-4 max-[720px]:hidden">{status}{state ? ` · ${state.model.replace(/^anthropic\//, '')}` : ''}</div>
      {PAGES.filter(p => p.group === 'top').map(item)}
      {label('Work')}
      {PAGES.filter(p => p.group === 'work').map(item)}
      {label('Settings')}
      {PAGES.filter(p => p.group === 'settings').map(item)}
    </nav>
  )
}
