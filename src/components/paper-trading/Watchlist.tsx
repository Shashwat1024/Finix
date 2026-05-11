'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WatchlistItem } from '@/types'
import { Plus, Trash2, TrendingUp, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  items: WatchlistItem[]
  userId: string
}

type SignalData = {
  price: number
  change: number
  signal: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell'
  reason: string
}

const SIGNAL_STYLES: Record<string, string> = {
  'Strong Buy': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Buy': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Hold': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'Sell': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Strong Sell': 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function Watchlist({ items: initialItems }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [ticker, setTicker] = useState('')
  const [adding, setAdding] = useState(false)
  const [tradeModal, setTradeModal] = useState<{ ticker: string; signal?: SignalData } | null>(null)
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy')
  const [quantity, setQuantity] = useState('')
  const [tradeLoading, setTradeLoading] = useState(false)
  const [tradeMsg, setTradeMsg] = useState('')
  const [tradeSuccess, setTradeSuccess] = useState(false)
  const [signals, setSignals] = useState<Record<string, SignalData | 'loading' | 'error'>>({})

  async function fetchSignals(tickers: string[]) {
    const updates: Record<string, SignalData | 'loading' | 'error'> = {}
    tickers.forEach((t) => { updates[t] = 'loading' })
    setSignals((prev) => ({ ...prev, ...updates }))

    await Promise.all(tickers.map(async (t) => {
      try {
        const res = await fetch(`/api/signal?ticker=${t}`)
        const data = await res.json()
        setSignals((prev) => ({ ...prev, [t]: res.ok ? data : 'error' }))
      } catch {
        setSignals((prev) => ({ ...prev, [t]: 'error' }))
      }
    }))
  }

  useEffect(() => {
    if (items.length > 0) fetchSignals(items.map((i) => i.ticker))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function addToWatchlist(e: React.FormEvent) {
    e.preventDefault()
    if (!ticker.trim()) return
    setAdding(true)
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: ticker.toUpperCase() }),
    })
    if (res.ok) {
      const { item } = await res.json()
      setItems((prev) => [...prev, item])
      fetchSignals([ticker.toUpperCase()])
      setTicker('')
    }
    setAdding(false)
  }

  async function removeItem(id: string, t: string) {
    await fetch(`/api/watchlist/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
    setSignals((prev) => { const n = { ...prev }; delete n[t]; return n })
  }

  async function executeTrade() {
    if (!tradeModal || !quantity) return
    setTradeLoading(true)
    setTradeMsg('')
    setTradeSuccess(false)
    const res = await fetch('/api/paper-trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: tradeModal.ticker, action: tradeAction, quantity: Number(quantity) }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      setTradeSuccess(true)
      setTradeMsg(data.message)
      router.refresh()
    } else {
      setTradeMsg(data.message ?? data.error ?? 'Trade failed')
    }
    setTradeLoading(false)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Watchlist</h2>
        <button
          onClick={() => fetchSignals(items.map((i) => i.ticker))}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh signals"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <form onSubmit={addToWatchlist} className="flex gap-2 mb-4">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="NSE ticker e.g. INFY"
          className="flex-1 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={adding || !ticker}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </form>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-muted-foreground text-sm">No stocks in watchlist</p>}
        {items.map((item) => {
          const sig = signals[item.ticker]
          const sigData = sig && sig !== 'loading' && sig !== 'error' ? sig as SignalData : null

          return (
            <div key={item.id} className="rounded-md bg-secondary/60 border border-border/40 px-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{item.ticker}</p>
                    {sig === 'loading' && (
                      <span className="text-[10px] text-muted-foreground animate-pulse">loading…</span>
                    )}
                    {sigData && (
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', SIGNAL_STYLES[sigData.signal])}>
                        {sigData.signal}
                      </span>
                    )}
                  </div>
                  {sigData && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium">₹{sigData.price.toFixed(2)}</span>
                      <span className={cn('text-[11px]', sigData.change >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {sigData.change >= 0 ? '+' : ''}{sigData.change}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setTradeModal({ ticker: item.ticker, signal: sigData ?? undefined })}
                    className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                  >
                    <TrendingUp className="h-3 w-3" />Trade
                  </button>
                  <button onClick={() => removeItem(item.id, item.ticker)} className="text-muted-foreground hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {sigData && (
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{sigData.reason}</p>
              )}
            </div>
          )
        })}
      </div>

      {tradeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-lg p-6 w-full sm:w-80 space-y-4">
            <div>
              <h3 className="font-semibold">Trade {tradeModal.ticker}</h3>
              {tradeModal.signal && (
                <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border mt-1 inline-block', SIGNAL_STYLES[tradeModal.signal.signal])}>
                  {tradeModal.signal.signal} · ₹{tradeModal.signal.price.toFixed(2)}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {(['buy', 'sell'] as const).map((a) => (
                <button key={a} onClick={() => setTradeAction(a)}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium ${tradeAction === a ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantity" min={1}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            {tradeMsg && (
              <p className={`text-xs ${tradeSuccess ? 'text-green-400' : 'text-red-400'}`}>{tradeMsg}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setTradeModal(null); setTradeMsg(''); setQuantity(''); setTradeSuccess(false) }}
                className="flex-1 rounded-md border border-border py-1.5 text-sm">
                {tradeSuccess ? 'Close' : 'Cancel'}
              </button>
              {!tradeSuccess && (
                <button onClick={executeTrade} disabled={tradeLoading || !quantity}
                  className="flex-1 rounded-md bg-primary text-primary-foreground py-1.5 text-sm disabled:opacity-50">
                  {tradeLoading ? '…' : 'Confirm'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
