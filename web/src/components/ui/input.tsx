import * as React from 'react'
import { cn } from '@/lib/utils'

const field = 'w-full min-w-0 rounded-[10px] border border-line bg-card px-3 text-body text-text placeholder:text-text-5 outline-none focus:border-text-5 disabled:opacity-50'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input data-slot="input" className={cn(field, 'h-10', className)} {...props} />
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(field, 'resize-none py-2.5', className)} {...props} />
}

export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return <select data-slot="select" className={cn(field, 'h-10', className)} {...props} />
}
