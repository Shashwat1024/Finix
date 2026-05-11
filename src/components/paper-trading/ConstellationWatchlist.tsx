'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw, X } from 'lucide-react'
import { WatchlistItem } from '@/types'
import { cn } from '@/lib/utils'
import { useCanvasCamera } from '@/hooks/useCanvasCamera'

type Signal = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell'
interface SignalData { price: number; change: number; signal: Signal; reason: string }

interface Props {
  items: WatchlistItem[]
  userId: string
}

// Signal → ring radius multiplier (inner = high conviction)
const SIGNAL_RING: Record<Signal, number> = {
  'Strong Buy': 0.22, 'Buy': 0.34, 'Hold': 0.46, 'Sell': 0.58, 'Strong Sell': 0.70,
}
const SIGNAL_COLOR: Record<Signal, string> = {
  'Strong Buy': '#22c55e', 'Buy': '#86efac', 'Hold': '#94a3b8', 'Sell': '#fb923c', 'Strong Sell': '#ef4444',
}
const SIGNAL_GLOW_SIZE: Record<Signal, number> = {
  'Strong Buy': 18, 'Buy': 14, 'Hold': 9, 'Sell': 14, 'Strong Sell': 18,
}

// Deterministic angle from ticker string
function tickerAngle(ticker: string, seed = 0): number {
  let h = seed
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) & 0xffffffff
  return ((h >>> 0) / 0xffffffff) * Math.PI * 2
}

// NSE sector groupings for constellation lines
const SECTORS: Record<string, string> = {
  INFY: 'IT', TCS: 'IT', WIPRO: 'IT', HCLTECH: 'IT', TECHM: 'IT',
  HDFCBANK: 'BANK', ICICIBANK: 'BANK', AXISBANK: 'BANK', SBIN: 'BANK', KOTAKBANK: 'BANK',
  RELIANCE: 'ENERGY', ONGC: 'ENERGY', NTPC: 'ENERGY',
  TATAMOTORS: 'AUTO', MARUTI: 'AUTO', BAJAJFINSV: 'AUTO',
  SUNPHARMA: 'PHARMA', DRREDDY: 'PHARMA', CIPLA: 'PHARMA',
}

interface Star {
  ticker: string; x: number; y: number
  baseR: number; color: string; glowSize: number
  phase: number; phaseSpeed: number
  signal: Signal | null; data: SignalData | null
}

const TOOLTIP_STYLES: Record<Signal, string> = {
  'Strong Buy': 'border-green-500/50 text-green-400',
  'Buy': 'border-green-400/40 text-green-300',
  'Hold': 'border-border text-muted-foreground',
  'Sell': 'border-orange-500/50 text-orange-400',
  'Strong Sell': 'border-red-500/50 text-red-400',
}

export default function ConstellationWatchlist({ items: initialItems, userId: _userId }: Props) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)
  const starsRef = useRef<Star[]>([])
  const { cameraRef, reset, toWorld, wasDrag } = useCanvasCamera(canvasRef)

  const rotRef = useRef(0)

  const [items, setItems] = useState(initialItems)
  const [signals, setSignals] = useState<Record<string, SignalData | 'loading' | 'error'>>({})
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [ticker, setTicker] = useState('')
  const [adding, setAdding] = useState(false)

  // Trade modal state
  const [tradeModal, setTradeModal] = useState<{ ticker: string; signal?: SignalData } | null>(null)
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy')
  const [quantity, setQuantity] = useState('')
  const [tradeLoading, setTradeLoading] = useState(false)
  const [tradeMsg, setTradeMsg] = useState('')
  const [tradeSuccess, setTradeSuccess] = useState(false)

  const fetchSignals = useCallback(async (tickers: string[]) => {
    setSignals((prev) => {
      const u = { ...prev }
      tickers.forEach((t) => { u[t] = 'loading' })
      return u
    })
    await Promise.all(tickers.map(async (t) => {
      try {
        const res = await fetch(`/api/signal?ticker=${t}`)
        const data = await res.json()
        setSignals((prev) => ({ ...prev, [t]: res.ok ? data : 'error' }))
      } catch {
        setSignals((prev) => ({ ...prev, [t]: 'error' }))
      }
    }))
  }, [])

  useEffect(() => {
    if (items.length > 0) fetchSignals(items.map((i) => i.ticker))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build stars whenever items or signals change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    const cx = W / 2, cy = H / 2
    const maxR = Math.min(W, H) * 0.42

    starsRef.current = items.map((item, i) => {
      const sig = signals[item.ticker]
      const sigData = sig && sig !== 'loading' && sig !== 'error' ? sig as SignalData : null
      const signal = sigData?.signal ?? null
      const ringFactor = signal ? SIGNAL_RING[signal] : 0.46
      const angle = tickerAngle(item.ticker, i * 7)
      const r = maxR * ringFactor

      return {
        ticker: item.ticker,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        baseR: signal ? (signal.includes('Strong') ? 6 : 4.5) : 3.5,
        color: signal ? SIGNAL_COLOR[signal] : '#94a3b8',
        glowSize: signal ? SIGNAL_GLOW_SIZE[signal] : 6,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.015 + Math.random() * 0.015,
        signal,
        data: sigData,
      }
    })
  }, [items, signals])

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cvs = canvas
    const ctx = cvs.getContext('2d')!

    const resize = () => {
      const DPR = window.devicePixelRatio || 1
      const W = cvs.offsetWidth, H = cvs.offsetHeight
      cvs.width = W * DPR; cvs.height = H * DPR
      ctx.scale(DPR, DPR)
    }
    resize()
    window.addEventListener('resize', resize)

    // Static background stars
    const bgStars: { x: number; y: number; r: number; a: number }[] = []
    const genBg = () => {
      bgStars.length = 0
      const W = cvs.offsetWidth, H = cvs.offsetHeight
      for (let i = 0; i < 220; i++)
        bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 0.7 + 0.1, a: Math.random() * 0.4 + 0.05 })
    }
    genBg()

    let rot = 0

    function draw() {
      const W = cvs.offsetWidth, H = cvs.offsetHeight
      const cx = W / 2, cy = H / 2
      ctx.clearRect(0, 0, W, H)

      // Deep space background
      const bg = ctx.createRadialGradient(cx, cy * 0.7, 0, cx, cy, Math.max(W, H) * 0.7)
      bg.addColorStop(0, 'rgba(8,8,18,1)')
      bg.addColorStop(1, 'rgba(2,2,6,1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Background micro-stars (outside camera so they stay fixed)
      for (const s of bgStars) {
        ctx.globalAlpha = s.a
        ctx.fillStyle = '#cbd5e1'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Apply camera for everything below
      const cam = cameraRef.current
      ctx.save()
      ctx.translate(cam.panX, cam.panY)
      ctx.scale(cam.zoom, cam.zoom)

      // Slow rotation of the whole field
      rot += 0.00018
      rotRef.current = rot

      const stars = starsRef.current
      if (stars.length === 0) {
        // Empty state
        ctx.fillStyle = 'rgba(148,163,184,0.3)'
        ctx.font = '13px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText('Add tickers to populate the constellation', cx, cy)
        animRef.current = requestAnimationFrame(draw)
        return
      }

      // Ring guides (subtle)
      const rings = [0.22, 0.34, 0.46, 0.58, 0.70]
      const ringLabels = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell']
      const maxR = Math.min(W, H) * 0.42
      rings.forEach((rf, i) => {
        ctx.strokeStyle = `rgba(255,255,255,0.04)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(cx, cy, maxR * rf, 0, Math.PI * 2)
        ctx.stroke()
        // Ring label
        ctx.fillStyle = 'rgba(148,163,184,0.18)'
        ctx.font = '8px system-ui'
        ctx.textAlign = 'left'
        ctx.fillText(ringLabels[i], cx + maxR * rf + 4, cy - 3)
      })

      // Constellation lines (same sector, rotated)
      const sectorGroups: Record<string, Star[]> = {}
      for (const s of stars) {
        const sec = SECTORS[s.ticker] ?? s.ticker
        ;(sectorGroups[sec] ??= []).push(s)
      }
      for (const group of Object.values(sectorGroups)) {
        if (group.length < 2) continue
        for (let i = 0; i < group.length - 1; i++) {
          const a = rotatedStar(group[i], cx, cy, rot)
          const b = rotatedStar(group[i + 1], cx, cy, rot)
          const isHov = hoveredTicker === group[i].ticker || hoveredTicker === group[i + 1].ticker
          ctx.strokeStyle = isHov ? `rgba(148,163,184,0.4)` : `rgba(148,163,184,0.1)`
          ctx.lineWidth = isHov ? 1 : 0.5
          ctx.setLineDash([3, 5])
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // Stars
      for (const star of stars) {
        star.phase += star.phaseSpeed
        const { x, y } = rotatedStar(star, cx, cy, rot)
        const twinkle = 0.7 + Math.sin(star.phase) * 0.3
        const isHov = hoveredTicker === star.ticker
        const r = star.baseR * (isHov ? 1.6 : 1) * twinkle

        // Outer glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, star.glowSize * (isHov ? 2.2 : 1.4))
        grad.addColorStop(0, star.color + 'cc')
        grad.addColorStop(0.4, star.color + '55')
        grad.addColorStop(1, star.color + '00')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, star.glowSize * (isHov ? 2.2 : 1.4), 0, Math.PI * 2)
        ctx.fill()

        // Star core
        ctx.shadowBlur = isHov ? 20 : 10
        ctx.shadowColor = star.color
        ctx.globalAlpha = twinkle
        ctx.fillStyle = isHov ? '#ffffff' : star.color
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1

        // Ticker label
        ctx.fillStyle = isHov ? '#ffffff' : 'rgba(226,232,240,0.75)'
        ctx.font = isHov ? 'bold 11px system-ui' : '10px system-ui'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(star.ticker, x, y + r + 10)

        // Price below ticker
        if (star.data) {
          const changeColor = star.data.change >= 0 ? '#86efac' : '#fca5a5'
          ctx.font = '8px system-ui'
          ctx.fillStyle = changeColor
          ctx.fillText(`₹${star.data.price.toFixed(0)}  ${star.data.change >= 0 ? '+' : ''}${star.data.change}%`, x, y + r + 22)
        }
      }
      ctx.textBaseline = 'alphabetic'
      ctx.restore() // end camera transform

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredTicker])

  function rotatedStar(star: Star, cx: number, cy: number, rot: number) {
    const dx = star.x - cx, dy = star.y - cy
    const angle = Math.atan2(dy, dx) + rot
    const dist = Math.sqrt(dx * dx + dy * dy)
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const { x: wx, y: wy } = toWorld(sx, sy)
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    const cx = W / 2, cy = H / 2

    let found: string | null = null
    for (const star of starsRef.current) {
      const pos = rotatedStar(star, cx, cy, rotRef.current)
      const dist = Math.sqrt((wx - pos.x) ** 2 + (wy - pos.y) ** 2)
      if (dist < 20 + star.baseR) { found = star.ticker; break }
    }
    setHoveredTicker(found)
    if (found) setTooltipPos({ x: sx, y: sy })
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (wasDrag()) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top
    const { x: wx, y: wy } = toWorld(sx, sy)
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    const cx = W / 2, cy = H / 2
    for (const star of starsRef.current) {
      const pos = rotatedStar(star, cx, cy, rotRef.current)
      const dist = Math.sqrt((wx - pos.x) ** 2 + (wy - pos.y) ** 2)
      if (dist < 24 + star.baseR) {
        setTradeModal({ ticker: star.ticker, signal: star.data ?? undefined })
        setTradeMsg(''); setQuantity(''); setTradeSuccess(false)
        return
      }
    }
  }

  async function addToWatchlist(e: React.FormEvent) {
    e.preventDefault()
    if (!ticker.trim()) return
    setAdding(true)
    const res = await fetch('/api/watchlist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    setTradeLoading(true); setTradeMsg('')
    const res = await fetch('/api/paper-trade', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: tradeModal.ticker, action: tradeAction, quantity: Number(quantity) }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      setTradeSuccess(true); setTradeMsg(data.message); router.refresh()
    } else {
      setTradeMsg(data.message ?? data.error ?? 'Trade failed')
    }
    setTradeLoading(false)
  }

  const hoveredStar = starsRef.current.find((s) => s.ticker === hoveredTicker)

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Constellation</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Inner rings = stronger signal · Click a star to trade</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchSignals(items.map((i) => i.ticker))}
            className="text-muted-foreground hover:text-foreground transition-colors" title="Refresh signals">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <form onSubmit={addToWatchlist} className="flex gap-2 mb-3">
        <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Add ticker e.g. INFY"
          className="flex-1 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <button type="submit" disabled={adding || !ticker}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
          <Plus className="h-3 w-3" /> Add
        </button>
      </form>

      {/* Watchlist pill badges for remove */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {items.map((item) => {
            const sig = signals[item.ticker]
            const sigData = sig && sig !== 'loading' && sig !== 'error' ? sig as SignalData : null
            const color = sigData ? SIGNAL_COLOR[sigData.signal] : '#94a3b8'
            return (
              <div key={item.id} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                style={{ borderColor: color + '60', color }}>
                <span className="font-semibold">{item.ticker}</span>
                {sig === 'loading' && <span className="text-[9px] opacity-60">…</span>}
                {sigData && <span className="text-[9px] opacity-70">{sigData.signal}</span>}
                <button onClick={() => removeItem(item.id, item.ticker)}
                  className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity">
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} className="relative">
        <canvas
          ref={canvasRef}
          className="w-full rounded-md"
          style={{ height: '340px', cursor: hoveredTicker ? 'pointer' : 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredTicker(null)}
          onClick={handleClick}
        />

        {/* Hover tooltip */}
        {hoveredTicker && hoveredStar && (
          <div
            className={cn(
              'pointer-events-none absolute z-10 rounded-lg border bg-card/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl max-w-[180px]',
              hoveredStar.signal ? TOOLTIP_STYLES[hoveredStar.signal] : 'border-border text-muted-foreground'
            )}
            style={{ left: Math.min(tooltipPos.x + 12, 220), top: Math.max(tooltipPos.y - 60, 8) }}
          >
            <p className="font-bold text-sm mb-0.5">{hoveredTicker}</p>
            {hoveredStar.data ? (
              <>
                <p>₹{hoveredStar.data.price.toFixed(2)}
                  <span className={cn('ml-1.5', hoveredStar.data.change >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {hoveredStar.data.change >= 0 ? '+' : ''}{hoveredStar.data.change}%
                  </span>
                </p>
                <p className="font-semibold mt-0.5">{hoveredStar.data.signal}</p>
                <p className="text-[10px] opacity-70 mt-0.5 leading-relaxed line-clamp-2">{hoveredStar.data.reason}</p>
                <p className="text-[9px] opacity-50 mt-1">Click to trade</p>
              </>
            ) : (
              <p className="opacity-60">Loading signal…</p>
            )}
          </div>
        )}
      </div>

      {/* Trade modal */}
      {tradeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl p-6 w-full sm:w-80 space-y-4">
            <div>
              <h3 className="font-semibold">Trade {tradeModal.ticker}</h3>
              {tradeModal.signal && (
                <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border mt-1 inline-block',
                  TOOLTIP_STYLES[tradeModal.signal.signal])}>
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
            {tradeMsg && <p className={`text-xs ${tradeSuccess ? 'text-green-400' : 'text-red-400'}`}>{tradeMsg}</p>}
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
