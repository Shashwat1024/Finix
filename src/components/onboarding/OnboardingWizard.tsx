'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, ChevronRight, Wallet, Shield, Zap } from 'lucide-react'
import { RiskProfile } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  email: string
  initialRiskProfile: RiskProfile
  hasDhanToken: boolean
}

const STEPS = [
  { id: 1, label: 'Welcome', icon: Zap },
  { id: 2, label: 'Risk Profile', icon: Shield },
  { id: 3, label: 'DHAN Token', icon: Wallet },
]

const RISK_OPTIONS: { value: RiskProfile; label: string; desc: string }[] = [
  { value: 'conservative', label: 'Conservative', desc: 'Capital preservation, low volatility. Prefer FDs, bonds, large-caps.' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced growth + stability. Mix of equity and debt.' },
  { value: 'aggressive', label: 'Aggressive', desc: 'High growth focus. Comfortable with short-term volatility.' },
]

export default function OnboardingWizard({ email, initialRiskProfile, hasDhanToken }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(initialRiskProfile)
  const [dhanToken, setDhanToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function saveAndContinue() {
    if (step === 2) {
      setSaving(true)
      setError('')
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ risk_profile: riskProfile }),
      })
      setSaving(false)
      setStep(3)
      return
    }

    if (step === 3) {
      setSaving(true)
      setError('')
      try {
        const body: Record<string, string> = { risk_profile: riskProfile, onboarding_complete: 'true' }
        if (dhanToken.trim()) body.dhan_token = dhanToken.trim()
        const res = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const d = await res.json()
          setError(d.error ?? 'Failed to save')
          setSaving(false)
          return
        }
        router.push('/dashboard')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error')
        setSaving(false)
      }
    }
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="w-full max-w-md">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const done = step > s.id
          const active = step === s.id
          return (
            <div key={s.id} className="flex items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                done ? 'bg-primary border-primary text-primary-foreground' :
                active ? 'border-primary text-primary' :
                'border-border text-muted-foreground'
              )}>
                {done ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-0.5 w-12 mx-1 transition-all', step > s.id ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
        {step === 1 && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome to Finix</h1>
              <p className="text-muted-foreground text-sm mt-1">{email}</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your AI-powered financial co-pilot for Indian markets. We&apos;ll help you track spending, monitor your portfolio, and make smarter investment decisions.
            </p>
            <ul className="text-sm text-left space-y-2 text-muted-foreground">
              {[
                'Expense tracking & categorization',
                'Paper trading with AI signals',
                'Personalized financial insights',
                'Chat with your financial data',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">What&apos;s your risk appetite?</h2>
              <p className="text-muted-foreground text-sm mt-1">This helps us tailor insights and recommendations for you.</p>
            </div>
            <div className="space-y-2.5">
              {RISK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRiskProfile(opt.value)}
                  className={cn(
                    'w-full text-left rounded-lg border p-4 transition-all',
                    riskProfile === opt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border/80 hover:bg-secondary/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{opt.label}</span>
                    {riskProfile === opt.value && <CheckCircle className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={saveAndContinue}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Continue'} {!saving && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">Connect DHAN account</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Add your DHAN API token to sync real transaction and holdings data. You can skip this and add it later in Settings.
              </p>
            </div>
            {hasDhanToken && (
              <div className="rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-xs text-green-400">
                DHAN token already configured.
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                DHAN API Token
              </label>
              <input
                type="password"
                value={dhanToken}
                onChange={(e) => setDhanToken(e.target.value)}
                placeholder={hasDhanToken ? 'Enter new token to replace existing' : 'Paste your DHAN JWT token here'}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Find this in DHAN → API → Access Token. Stored encrypted, never exposed client-side.
              </p>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setDhanToken(''); saveAndContinue() }}
                disabled={saving}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm text-muted-foreground hover:bg-secondary/40 transition-colors disabled:opacity-50"
              >
                Skip for now
              </button>
              <button
                onClick={saveAndContinue}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Finish setup'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 h-1 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
