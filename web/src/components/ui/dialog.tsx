import * as React from 'react'
import { Dialog as Base } from '@base-ui/react/dialog'
import { cn } from '@/lib/utils'

// shadcn's Dialog, on Base UI (the base-nova style).
export function Dialog({
  open, onOpenChange, title, description, children, className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <Base.Root open={open} onOpenChange={onOpenChange}>
      <Base.Portal>
        <Base.Backdrop className="fixed inset-0 z-40 bg-black/55" />
        <Base.Popup
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-line bg-panel p-5 text-text outline-none',
            className,
          )}
        >
          <Base.Title className="m-0 text-value font-semibold">{title}</Base.Title>
          {description && <Base.Description className="mt-1.5 mb-3.5 text-secondary text-text-4">{description}</Base.Description>}
          {children}
        </Base.Popup>
      </Base.Portal>
    </Base.Root>
  )
}
