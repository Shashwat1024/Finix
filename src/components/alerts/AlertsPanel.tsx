'use client'

import { useState } from 'react'
import { Bell, BellOff, Plus, Trash2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertType = 'price_above' | 'price_below' | 'spend_limit'

interface Alert {
  id: string
  type: AlertType
  ticker: string | null
  category: string | null
  threshold: number
  label: string
  triggered: boolean
  triggered_at: string | null
  created_at: string
}

interface Props {
  initialAlerts: Alert[]
}

const TYPE_LABELS: Record<AlertType, string> = {
  price_above: 'Price above ₹',
  price_below: 'Price below ₹',
  spend_limit: 'Monthly spend > ₹',
}

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Investments', 'Utilities', 'Healthcare', 'Shopping', 'Others']

export default function AlertsPanel({ initialAlerts }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<AlertType>('price_above')
  const [ticker, setTicker] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [threshold, setThreshold] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isPriceAlert = type === 'price_above' || type === 'price_below'

  async function createAlert(e: React.FormEvent) {
    e.preventDefault()
    if (!threshold || !label) return
    setSaving(true)
    setError('')
    const body: Record<string, unknown> = {
      type,
      threshold: Number(threshold),
      label,
    }
    if (isPriceAlert) body.ticker = ticker.toUpperCase()
    else body.category = category

    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      setAlerts((prev) => [data.alert, ...prev])
      setShowForm(false)
      setTicker('')
      setThreshold('')
      setLabel('')
    } else {
      setError(data.error ?? 'Failed to create alert')
    }
    setSaving(false)
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Alert
        </button>
      </div>

      {showForm && (
        <form onSubmit={createAlert} className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm">Create Alert</h3>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Alert type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AlertType)}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {(Object.keys(TYPE_LABELS) as AlertType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}…</option>
              ))}
            </select>
          </div>

          {isPriceAlert ? (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">NSE Ticker</label>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="e.g. INFY"
                required
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Threshold (₹)</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g. 1500"
              min={0}
              required
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. INFY hits target"
              required
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-md border border-border py-2 text-sm text-muted-foreground hover:bg-secondary/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-md bg-primary text-primary-foreground py-2 text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {saving ? 'Creating…' : 'Create Alert'}
            </button>
          </div>
        </form>
      )}

      {alerts.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <BellOff className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No alerts yet. Create one to get notified.</p>
        </div>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'flex items-start justify-between gap-3 rounded-lg border px-4 py-3',
              alert.triggered ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-card'
            )}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className={cn('mt-0.5 shrink-0', alert.triggered ? 'text-green-400' : 'text-muted-foreground')}>
                {alert.triggered ? <CheckCircle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{alert.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {TYPE_LABELS[alert.type]}
                  {alert.threshold.toLocaleString('en-IN')}
                  {alert.ticker ? ` · ${alert.ticker}` : ''}
                  {alert.category ? ` · ${alert.category}` : ''}
                </p>
                {alert.triggered && alert.triggered_at && (
                  <p className="text-[11px] text-green-400 mt-0.5">
                    Triggered {new Date(alert.triggered_at).toLocaleDateString('en-IN')}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => deleteAlert(alert.id)}
              className="text-muted-foreground hover:text-red-400 shrink-0 transition-colors mt-0.5"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
