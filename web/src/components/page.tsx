import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// The page header of DESIGN.md: a label, the page's name, a one-line
// summary, the page's actions on the right.
export function PageHead({ label, title, summary, actions }: { label: string; title: string; summary?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-end gap-3 border-b border-line-soft px-8 pt-6 pb-3.5 max-[720px]:px-4 max-[720px]:pt-3.5 max-[720px]:pb-2.5">
      <div className="min-w-0">
        <div className="text-caption font-semibold tracking-[.04em] text-text-3 uppercase max-[720px]:hidden">{label}</div>
        <h1 className="m-0 mt-0.5 text-headline leading-tight font-semibold tracking-[-.015em] max-[720px]:text-[20px]">{title}</h1>
        <div className="mt-1 min-h-[1em] text-secondary text-text-4">{summary}</div>
      </div>
      <span className="flex-1" />
      <div className="flex gap-2">{actions}</div>
    </div>
  )
}

export function Scroll({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex-1 overflow-y-auto px-8 pt-2 pb-5 max-[720px]:px-4', className)} {...props} />
}

export function Column({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-[880px]', className)}>{children}</div>
}

export function Pill({ tone, children }: { tone?: 'wait' | 'run'; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs2', tone === 'wait' ? 'text-warn' : tone === 'run' ? 'text-ok' : 'text-text-3')}>
      <span className={cn('size-[7px] rounded-full', tone === 'wait' ? 'bg-warn' : tone === 'run' ? 'bg-ok' : 'bg-text-5')} />
      {children}
    </span>
  )
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto mt-[16vh] max-w-[420px] text-center text-text-4">
      <h2 className="m-0 mb-1.5 text-value font-semibold text-text">{title}</h2>
      {children}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
