import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// shadcn's Button, on DESIGN.md's tokens: one primary per view at most.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border text-body font-medium transition-colors cursor-pointer disabled:cursor-default disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-chip border-line text-text hover:border-text-5',
        primary: 'bg-text border-text text-bg font-semibold hover:opacity-90',
        ghost: 'bg-transparent border-transparent text-text-3 hover:bg-raised hover:text-text',
        danger: 'bg-chip border-line text-bad hover:border-bad',
        outline: 'bg-transparent border-line text-text-2 hover:border-text-5 hover:text-text',
      },
      size: {
        default: 'h-10 px-3.5',
        sm: 'h-8 px-2.5 text-secondary rounded-lg',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export function Button({
  className, variant, size, ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return <button data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
