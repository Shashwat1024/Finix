'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RiskProfile } from '@/types'
import { CheckCircle } from 'lucide-react'

interface Props {
  initialRiskProfile: string
  hasDhanToken: boolean
  email: string
}

export default function SettingsForm({ initialRiskProfile, hasDhanToken: initialHasDhanToken, email }: Props) {
  const router = useRouter()
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(initialRiskProfile as RiskProfile)
  const [dhanToken, setDhanToken] = useState('')
  const [hasDhanToken, setHasDhanToken] = useState(initialHasDhanToken)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ risk_profile: riskProfile, dhan_token: dhanToken || undefined }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Save failed')
    } else {
      setSaved(true)
      if (dhanToken) setHasDhanToken(true)
      setDhanToken('')
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Account</h2>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Email</label>
          <p className="text-sm">{email}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">DHAN Connection</h2>

        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasDhanToken ? 'bg-green-400' : 'bg-yellow-400'}`} />
          <span className={`text-sm ${hasDhanToken ? 'text-green-400' : 'text-yellow-400'}`}>
            {hasDhanToken ? 'Token configured — ready to sync' : 'No token — sync will not work'}
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {hasDhanToken ? 'Replace DHAN token' : 'Add DHAN token'}
          </label>
          <input
            type="password"
            value={dhanToken}
            onChange={(e) => setDhanToken(e.target.value)}
            placeholder="Paste your DHAN access token"
            className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Get your token from DHAN → My Profile → Access Token. Stored encrypted.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Risk Profile</h2>
        <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
          {(['conservative', 'moderate', 'aggressive'] as RiskProfile[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRiskProfile(r)}
              className={`flex-1 rounded-md py-2 text-sm font-medium border transition-colors ${
                riskProfile === r
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saved && <CheckCircle className="h-4 w-4" />}
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
      </button>
    </form>
  )
}
