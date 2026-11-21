import { Bell, Folder, MessageSquare, Moon, Plus, Repeat, Settings, Sparkles, Sun, Users, type LucideIcon } from 'lucide-react'
import type { WorkspaceState, WorkspaceSummary } from '@/lib/api'
import { Logo } from '@/components/picture'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type Page = 'chat' | 'needs' | 'team' | 'routines' | 'files' | 'settings'

export const PAGES: { id: Page; label: string; icon: LucideIcon; soon?: boolean; group: 'top' | 'work' | 'end' }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare, group: 'top' },
  { id: 'needs', label: 'Needs you', icon: Bell, group: 'top' },
  { id: 'team', label: 'Team', icon: Users, soon: true, group: 'work' },
  { id: 'routines', label: 'Routines', icon: Repeat, soon: true, group: 'work' },
  { id: 'files', label: 'Files', icon: Folder, group: 'work' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'end' },
]

const tile = 'relative grid size-12 shrink-0 cursor-pointer place-items-center rounded-2xl p-0 transition-[border-radius] hover:rounded-xl max-md:size-11'

function Tip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

// The workspaces, one tile each, as Discord shows its servers.
export function SpacesBar({
  list, current, onPick, onAdd, theme, onTheme,
}: {
  list: WorkspaceSummary[]; current: string; onPick: (slug: string) => void; onAdd: () => void
  theme: 'dark' | 'light'; onTheme: () => void
}) {
  return (
    <nav aria-label="Workspaces" className="flex w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto py-3 max-md:w-auto max-md:flex-row max-md:overflow-x-auto max-md:overflow-y-hidden max-md:px-3 max-md:pt-[max(8px,env(safe-area-inset-top))] max-md:pb-2">
      <div className={cn(tile, 'cursor-default bg-card text-foreground hover:rounded-2xl')} title="a30m"><Sparkles className="size-5" /></div>
      <span className="my-0.5 h-px w-7 bg-foreground/10 max-md:mx-0.5 max-md:h-7 max-md:w-px" />
      {list.map(w => {
        const on = w.slug === current
        return (
          <Tip key={w.slug} label={w.name}>
            <button type="button" aria-label={w.name} aria-current={on} onClick={() => onPick(w.slug)} className={cn(tile, 'group')}>
              <span className={cn('absolute -left-3 w-1 rounded-r bg-foreground transition-[height] max-md:hidden', on ? 'h-9' : 'h-0 group-hover:h-5')} />
              <Logo slug={w.slug} name={w.name} version={w.image} className={cn('size-12 transition-[border-radius] group-hover:rounded-xl max-md:size-11', on && 'rounded-xl max-md:ring-2 max-md:ring-foreground max-md:ring-offset-2 max-md:ring-offset-background')} />
              {(w.waiting > 0 || w.running) && (
                <span className={cn('absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full ring-[3px] ring-background', w.waiting ? 'bg-amber-500' : 'bg-emerald-500')} />
              )}
            </button>
          </Tip>
        )
      })}
      <Tip label="New workspace">
        <button type="button" aria-label="New workspace" onClick={onAdd} className={cn(tile, 'bg-card text-emerald-500')}><Plus className="size-5" /></button>
      </Tip>
      <span className="flex-1 max-md:hidden" />
      <Tip label={theme === 'light' ? 'Dark' : 'Light'}>
        <button type="button" aria-label="Light or dark" onClick={onTheme} className={cn(tile, 'text-muted-foreground hover:bg-card hover:text-foreground max-md:hidden')}>
          {theme === 'light' ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
        </button>
      </Tip>
    </nav>
  )
}

// The open workspace's menu, next to the bar.
export function Menu({ name, description, state, page, onPage }: { name: string; description: string; state: WorkspaceState | null; page: Page; onPage: (p: Page) => void }) {
  const waiting = state?.waiting.length ?? 0
  const status = waiting ? 'Waiting for you' : state?.running ? 'Working' : 'Idle'
  const item = (p: (typeof PAGES)[number]) => (
    <button key={p.id} type="button" onClick={() => onPage(p.id)} aria-current={page === p.id}
      className={cn('flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground max-md:w-auto max-md:shrink-0',
        page === p.id && 'bg-accent text-foreground')}>
      <p.icon className="size-[18px] shrink-0" strokeWidth={1.8} />
      <span>{p.label}</span>
      {p.id === 'needs' && waiting > 0 && <span className="ml-auto grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{waiting}</span>}
      {p.soon && <span className="ml-auto text-[11px] text-muted-foreground/70 max-md:hidden">Soon</span>}
    </button>
  )
  const label = (text: string) => <h3 className="px-2.5 pt-4 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase max-md:hidden">{text}</h3>
  return (
    <nav aria-label="Workspace menu" className="flex w-[232px] shrink-0 flex-col gap-0.5 pt-4 pr-3 pb-3 pl-1 max-md:w-auto max-md:flex-row max-md:overflow-x-auto max-md:px-2 max-md:pt-0 max-md:pb-1.5">
      <div className="px-2.5 pb-3 max-md:hidden">
        <div className="truncate text-[15px] font-semibold">{name}</div>
        <div className="truncate text-xs text-muted-foreground" title={description || undefined}>{description || status}</div>
      </div>
      {PAGES.filter(p => p.group === 'top').map(item)}
      {label('Work')}
      {PAGES.filter(p => p.group === 'work').map(item)}
      <span className="flex-1 max-md:hidden" />
      {PAGES.filter(p => p.group === 'end').map(item)}
    </nav>
  )
}
