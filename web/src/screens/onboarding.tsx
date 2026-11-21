import { useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { ConnectModel } from '@/components/connect'
import { cn } from '@/lib/utils'

const TEMPLATE = `About me: 
How to answer: short and direct, in English.
Never: send, pay or publish without asking me.
`

// The first visit, and each new workspace: a name, a model, instructions.
export function Onboarding({ start, onFinish }: { start?: { slug: string; name: string }; onFinish: (slug: string) => void }) {
  const [ws, setWs] = useState(start ?? null)
  const [step, setStep] = useState(start ? 2 : 1)
  const [name, setName] = useState('Personal')
  const [text, setText] = useState(TEMPLATE)
  const [busy, setBusy] = useState(false)

  const create = async () => {
    if (!name.trim()) return
    setBusy(true)
    try { const r = await api<{ slug: string }>('workspaces', { name: name.trim() }); setWs({ slug: r.slug, name: name.trim() }); setStep(2) }
    catch (e) { toast.error((e as Error).message) }
    setBusy(false)
  }
  const finish = async (save: boolean) => {
    if (!ws) return
    if (save && text.trim() && text !== TEMPLATE) {
      try { await api(`workspaces/${ws.slug}/instructions`, { text }) } catch (e) { toast.error((e as Error).message); return }
    }
    onFinish(ws.slug)
  }

  const steps = start ? ['Model', 'Instructions'] : ['Workspace', 'Model', 'Instructions']
  const at = start ? step - 2 : step - 1

  return (
    <div className="flex flex-1 overflow-y-auto">
      <div className="m-auto w-full max-w-[640px] px-6 py-10 max-[720px]:px-4">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#4FCB8F] text-[#08261A]"><Sparkles className="size-5" /></span>
          <div>
            <div className="text-caption font-semibold tracking-[.04em] text-text-3 uppercase">{start ? start.name : 'Welcome to a30m'}</div>
            <div className="text-xs2 text-text-4">Step {at + 1} of {steps.length} · {steps[at]}</div>
          </div>
        </div>
        <div className="mb-7 flex gap-1.5">{steps.map((s, i) => <span key={s} className={cn('h-1 flex-1 rounded-full', i <= at ? 'bg-text' : 'bg-line')} />)}</div>

        {step === 1 && (
          <form onSubmit={e => { e.preventDefault(); create() }}>
            <h1 className="m-0 text-headline font-semibold tracking-[-.015em]">Create your first workspace</h1>
            <p className="mt-2 mb-5 text-text-3">A workspace is a world of its own: its agents, its files, its connections, its keys. Make one for your life, one per company. Nothing crosses from one to another.</p>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Personal, Acme Ltd…" />
            <div className="mt-5 flex justify-end"><Button variant="primary" type="submit" disabled={busy || !name.trim()}>Continue <ArrowRight /></Button></div>
          </form>
        )}

        {step === 2 && ws && (
          <div>
            <h1 className="m-0 text-headline font-semibold tracking-[-.015em]">Connect a model</h1>
            <p className="mt-2 mb-5 text-text-3">The model is the agents' brain. Paste an API key from one provider; you can add others later in Settings, and give each workspace its own.</p>
            <ConnectModel slug={ws.slug} onDone={() => setStep(3)} />
            <div className="mt-6 flex justify-end"><Button variant="ghost" onClick={() => setStep(3)}>Skip for now</Button></div>
          </div>
        )}

        {step === 3 && ws && (
          <div>
            <h1 className="m-0 text-headline font-semibold tracking-[-.015em]">Tell your agents about {ws.name}</h1>
            <p className="mt-2 mb-5 text-text-3">What they should know, how to answer, what they must never do. Agents read this before every task; only you can change it, in Settings › Agent.</p>
            <Textarea rows={7} value={text} onChange={e => setText(e.target.value)} className="font-mono text-secondary" />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => finish(false)}>Skip</Button>
              <Button variant="primary" onClick={() => finish(true)}>Start <ArrowRight /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
