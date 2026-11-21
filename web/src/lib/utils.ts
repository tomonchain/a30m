import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Our type scale (styles.css) must merge as font sizes, not colours.
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ['small', 'caption', 'xs2', 'secondary', 'body', 'card-title', 'value', 'headline'] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
