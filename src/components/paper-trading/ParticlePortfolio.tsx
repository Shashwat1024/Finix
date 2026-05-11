'use client'

import { useEffect, useRef, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { useCanvasCamera } from '@/hooks/useCanvasCamera'

interface Holding {
  ticker: string
  quantity: number
  avg_buy_price: number
  current_price: number
  unrealized_pnl: number
  pnl_pct: number
}

interface Props {
  holdings: Holding[]
  paperBalance: number
}

// NSE sector colors
const SECTOR: Record<string, string> = {
  INFY: '#3b82f6', TCS: '#3b82f6', WIPRO: '#3b82f6', HCLTECH: '#3b82f6', TECHM: '#3b82f6',
  HDFCBANK: '#f59e0b', ICICIBANK: '#f59e0b', AXISBANK: '#f59e0b', SBIN: '#f59e0b', KOTAKBANK: '#f59e0b',
  RELIANCE: '#8b5cf6', ONGC: '#8b5cf6', NTPC: '#8b5cf6',
  TATAMOTORS: '#10b981', MARUTI: '#10b981', BAJAJ: '#10b981',
  SUNPHARMA: '#ec4899', DRREDDY: '#ec4899', CIPLA: '#ec4899',
  TATASTEEL: '#f97316', JSWSTEEL: '#f97316', HINDALCO: '#f97316',
}
const DEFAULT_COLOR = '#94a3b8'
const CASH_COLOR = '#22c55e'

const PARTICLES_PER_VALUE = 4000 // 1 particle per ₹4000

interface Particle {
  x: number; y: number; vx: number; vy: number
  ci: number; color: string; r: number
  phase: number; phaseSpeed: number
}

interface Cluster {
  id: number; x: number; y: number
  ticker: string; color: string
  value: number; pnlPct: number
  pulsePhase: number; label2: string
}

export default function ParticlePortfolio({ holdings, paperBalance }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { cameraRef, reset } = useCanvasCamera(canvasRef)
  const [, forceHint] = useState(0)

  const totalValue = holdings.reduce((s, h) => s + h.quantity * h.current_price, 0) + paperBalance

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const DPR = window.devicePixelRatio || 1
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W * DPR
    canvas.height = H * DPR
    ctx.scale(DPR, DPR)

    const cx = W / 2, cy = H / 2

    // Build clusters
    const clusters: Cluster[] = []
    const n = holdings.length

    if (n === 0) {
      // Only cash
      clusters.push({
        id: 0, x: cx, y: cy,
        ticker: 'CASH', color: CASH_COLOR,
        value: paperBalance, pnlPct: 0,
        pulsePhase: 0, label2: formatCurrency(paperBalance),
      })
    } else {
      // Holdings in a ring
      const r = Math.min(W, H) * 0.3
      holdings.forEach((h, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2
        clusters.push({
          id: i,
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          ticker: h.ticker,
          color: SECTOR[h.ticker] ?? DEFAULT_COLOR,
          value: h.quantity * h.current_price,
          pnlPct: h.pnl_pct,
          pulsePhase: Math.random() * Math.PI * 2,
          label2: `${h.pnl_pct >= 0 ? '+' : ''}${h.pnl_pct.toFixed(1)}%`,
        })
      })
      // Cash at center
      clusters.push({
        id: n, x: cx, y: cy,
        ticker: 'CASH', color: CASH_COLOR,
        value: paperBalance, pnlPct: 0,
        pulsePhase: 0, label2: formatCurrency(paperBalance),
      })
    }

    // Background stars (static)
    const bgStars: { x: number; y: number; r: number; a: number }[] = []
    for (let i = 0; i < 180; i++) {
      bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 0.8 + 0.2, a: Math.random() * 0.5 + 0.1 })
    }

    // Build particles
    const particles: Particle[] = []
    for (const c of clusters) {
      const count = Math.max(4, Math.round(c.value / PARTICLES_PER_VALUE))
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const d = Math.random() * 35
        particles.push({
          x: c.x + Math.cos(a) * d,
          y: c.y + Math.sin(a) * d,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          ci: c.id,
          color: c.color,
          r: 1.5 + Math.random() * 1.5,
          phase: Math.random() * Math.PI * 2,
          phaseSpeed: 0.02 + Math.random() * 0.02,
        })
      }
    }

    let t = 0
    let animId: number

    function frame() {
      t++
      ctx.clearRect(0, 0, W, H)

      // Apply camera
      const cam = cameraRef.current
      ctx.save()
      ctx.translate(cam.panX, cam.panY)
      ctx.scale(cam.zoom, cam.zoom)

      // Radial background gradient
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7)
      bg.addColorStop(0, 'rgba(15,15,20,0.95)')
      bg.addColorStop(1, 'rgba(5,5,8,1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Background stars
      for (const s of bgStars) {
        ctx.globalAlpha = s.a
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Cluster halos
      for (const c of clusters) {
        const pulse = Math.sin(t * 0.025 + c.pulsePhase) * 0.15 + 0.85
        const haloR = 55 * pulse
        const isNeg = c.pnlPct < 0 && c.ticker !== 'CASH'
        const glowColor = c.ticker === 'CASH' ? CASH_COLOR : c.pnlPct >= 0 ? c.color : '#ef4444'

        const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, haloR * 1.8)
        grad.addColorStop(0, glowColor + '28')
        grad.addColorStop(0.5, glowColor + '12')
        grad.addColorStop(1, glowColor + '00')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(c.x, c.y, haloR * 1.8, 0, Math.PI * 2)
        ctx.fill()

        // Pulse ring for negative P&L
        if (isNeg) {
          const ringAlpha = (Math.sin(t * 0.04 + c.pulsePhase) * 0.5 + 0.5) * 0.4
          ctx.strokeStyle = `rgba(239,68,68,${ringAlpha})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(c.x, c.y, haloR + 8, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Update + draw particles
      ctx.shadowBlur = 0
      for (const p of particles) {
        const c = clusters.find((cl) => cl.id === p.ci)!
        const driftR = Math.sin(t * 0.018 + c.pulsePhase) * (c.pnlPct >= 0 ? 6 : -2)
        const driftAngle = t * 0.004 + c.pulsePhase

        const tx = c.x + Math.cos(driftAngle) * driftR
        const ty = c.y + Math.sin(driftAngle) * driftR

        // Spring toward target
        p.vx += (tx - p.x) * 0.012
        p.vy += (ty - p.y) * 0.012
        // Noise
        p.vx += (Math.random() - 0.5) * 0.12
        p.vy += (Math.random() - 0.5) * 0.12
        // Damping
        p.vx *= 0.9
        p.vy *= 0.9
        p.x += p.vx
        p.y += p.vy
        p.phase += p.phaseSpeed

        const alpha = 0.55 + Math.sin(p.phase) * 0.35

        ctx.shadowBlur = 10
        ctx.shadowColor = p.color
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      // Labels
      for (const c of clusters) {
        const pnlColor = c.ticker === 'CASH' ? CASH_COLOR : c.pnlPct >= 0 ? '#86efac' : '#fca5a5'

        // Ticker
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold 11px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        // Subtle text shadow
        ctx.shadowColor = c.color
        ctx.shadowBlur = 8
        ctx.fillText(c.ticker, c.x, c.y - 7)

        // P&L / balance
        ctx.shadowBlur = 0
        ctx.font = `9px system-ui`
        ctx.fillStyle = pnlColor
        ctx.fillText(c.label2, c.x, c.y + 7)
      }
      ctx.shadowBlur = 0
      ctx.textBaseline = 'alphabetic'
      ctx.restore()

      animId = requestAnimationFrame(frame)
    }

    frame()
    return () => cancelAnimationFrame(animId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, paperBalance])

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Portfolio Universe
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each particle = {formatCurrency(PARTICLES_PER_VALUE)} · Total {formatCurrency(totalValue)}
          </p>
        </div>
        <button onClick={() => { reset(); forceHint(n => n + 1) }}
          className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 transition-colors">
          Reset view
        </button>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full rounded-md cursor-grab active:cursor-grabbing"
          style={{ height: '340px', background: 'rgb(5,5,8)' }}
        />
        <div className="absolute bottom-2 right-2 text-[10px] text-white/20 pointer-events-none select-none">
          scroll to zoom · drag to pan · dbl-click to reset
        </div>
      </div>
    </div>
  )
}
