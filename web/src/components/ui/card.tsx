import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card" className={cn('rounded-2xl border border-line bg-card px-[18px] py-4', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('m-0 text-card-title font-semibold text-text', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('mt-1 mb-2.5 text-secondary text-text-4', className)} {...props} />
}

export function Chip({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('my-1 mr-1.5 inline-flex items-center gap-1.5 rounded-lg bg-chip px-2.5 py-0.5 text-secondary text-text-2', className)} {...props} />
}
