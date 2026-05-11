'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setStatus(null)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setStatus(data.error ?? 'Sync failed')
      } else {
        setStatus(`Synced ${data.synced_transactions} transactions`)
        setTimeout(() => window.location.reload(), 1000)
      }
    } catch {
      setStatus('Network error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
        {syncing ? 'Syncing…' : 'Sync'}
      </button>
    </div>
  )
}
