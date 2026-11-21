import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from '@/components/ui/sonner'
import { applyTheme } from '@/hooks/use-theme'
import App from './App'
import './index.css'

// Before the first paint: the owner's theme, or the system's.
applyTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="bottom-right" />
  </StrictMode>,
)
