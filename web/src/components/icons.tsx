import {
  BookOpen, FileText, Folder, Globe, PenLine, Plug, Search,
  type LucideIcon,
} from 'lucide-react'
import type { Said } from '@/lib/says'

export const TOOL_ICONS: Record<Said['icon'], LucideIcon> = {
  files: Folder, file: FileText, pen: PenLine, book: BookOpen, search: Search, globe: Globe, plug: Plug,
}
