'use client'

import { useMemo, useState, useId, useRef, useEffect, useCallback } from 'react'
import { Transaction, TransactionCategory } from '@/types'
import { CATEGORY_COLORS, formatCurrency } from '@/lib/utils'

interface Props {
  transactions: Transaction[]
}

const W = 700
const H = 420
const SRC_X = 110
const TGT_X = 520
const NODE_W = 140
const NODE_H = 36

interface SvgCam { zoom: number; panX: number; panY: number }
const DEFAULT_CAM: SvgCam = { zoom: 1, panX: 0, panY: 0 }

export default function MoneyFlow({ transactions }: Props) {
  const uid = useId().replace(/:/g, '')
  const [hovered, setHovered] = useState<string | null>(null)
  const svgWrapRef = useRef<HTMLDivElement>(null)
  const camRef = useRef<SvgCam>({ ...DEFAULT_CAM })
  const [cam, setCam] = useState<SvgCam>({ ...DEFAULT_CAM })
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const dragDist = useRef(0)
  const [dragging, setDragging] = useState(false)

  const resetCam = useCallback(() => {
    camRef.current = { ...DEFAULT_CAM }
    setCam({ ...DEFAULT_CAM })
  }, [])

  useEffect(() => {
    const el = svgWrapRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const vx = (sx / rect.width) * W
      const vy = (sy / rect.height) * H
      const c = camRef.current
      const factor = e.deltaY < 0 ? 1.1 : 0.92
      const newZoom = Math.max(0.5, Math.min(5, c.zoom * factor))
      const wx = (vx - c.panX) / c.zoom
      const wy = (vy - c.panY) / c.zoom
      camRef.current = { zoom: newZoom, panX: vx - wx * newZoom, panY: vy - wy * newZoom }
      setCam({ ...camRef.current })
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      isDragging.current = true
      dragDist.current = 0
      lastMouse.current = { x: e.clientX, y: e.clientY }
      setDragging(true)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const rect = el.getBoundingClientRect()
      const dx = (e.clientX - lastMouse.current.x) * (W / rect.width)
      const dy = (e.clientY - lastMouse.current.y) * (H / rect.height)
      dragDist.current += Math.abs(e.movementX) + Math.abs(e.movementY)
      lastMouse.current = { x: e.clientX, y: e.clientY }
      camRef.current.panX += dx
      camRef.current.panY += dy
      setCam({ ...camRef.current })
    }

    const onMouseUp = () => { isDragging.current = false; setDragging(false) }
    const onDblClick = () => resetCam()

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    el.addEventListener('dblclick', onDblClick)

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('dblclick', onDblClick)
    }
  }, [resetCam])

  const byCategory = useMemo(() => {
    const map: Partial<Record<TransactionCategory, number>> = {}
    for (const tx of transactions) {
      map[tx.category] = (map[tx.category] ?? 0) + tx.amount
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a) as [TransactionCategory, number][]
  }, [transactions])

  if (byCategory.length === 0) return null

  const total = byCategory.reduce((s, [, v]) => s + v, 0)

  const gap = 10
  const totalH = byCategory.length * NODE_H + (byCategory.length - 1) * gap
  const startY = (H - totalH) / 2
  const srcY = H / 2

  const nodes = byCategory.map(([cat, amount], i) => ({
    cat,
    amount,
    pct: amount / total,
    color: CATEGORY_COLORS[cat] ?? '#94a3b8',
    y: startY + i * (NODE_H + gap) + NODE_H / 2,
  }))

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Money Flow
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Watch your money travel to each category</p>
        </div>
        <button onClick={resetCam}
          className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 transition-colors">
          Reset view
        </button>
      </div>

      <div
        ref={svgWrapRef}
        className="w-full overflow-hidden rounded-md relative select-none"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <div className="absolute bottom-1.5 right-2 text-[10px] text-muted-foreground/30 pointer-events-none">
          scroll to zoom · drag to pan · dbl-click to reset
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 'clamp(260px, 40vw, 420px)' }}
        >
          <defs>
            {nodes.map((n) => (
              <linearGradient key={n.cat} id={`${uid}-g-${n.cat}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.15" />
                <stop offset="60%" stopColor={n.color} stopOpacity="0.4" />
                <stop offset="100%" stopColor={n.color} stopOpacity="0.8" />
              </linearGradient>
            ))}
            <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id={`${uid}-softglow`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <g transform={`translate(${cam.panX} ${cam.panY}) scale(${cam.zoom})`}>
          {/* Flow paths */}
          {nodes.map((n) => {
            const isHov = hovered === n.cat
            const cp1x = SRC_X + (TGT_X - SRC_X) * 0.42
            const cp2x = TGT_X - (TGT_X - SRC_X) * 0.42
            const d = `M${SRC_X},${srcY} C${cp1x},${srcY} ${cp2x},${n.y} ${TGT_X},${n.y}`
            const sw = Math.max(2, Math.min(22, n.pct * 90))
            const particleCount = Math.max(3, Math.ceil(n.pct * 22))
            const dur = 2.2

            return (
              <g key={n.cat}
                onMouseEnter={() => setHovered(n.cat)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}
              >
                {/* Wide soft channel */}
                <path d={d} fill="none"
                  stroke={`url(#${uid}-g-${n.cat})`}
                  strokeWidth={sw + 6}
                  strokeLinecap="round"
                  opacity={isHov ? 0.25 : 0.12}
                />
                {/* Main channel */}
                <path d={d} fill="none"
                  stroke={`url(#${uid}-g-${n.cat})`}
                  strokeWidth={sw}
                  strokeLinecap="round"
                  opacity={isHov ? 0.7 : 0.35}
                />

                {/* Flowing particles */}
                {Array.from({ length: particleCount }).map((_, i) => {
                  const offset = (i / particleCount) * dur
                  return (
                    <circle key={i}
                      r={isHov ? 3.5 : 2.5}
                      fill={n.color}
                      filter={`url(#${uid}-glow)`}
                      opacity={isHov ? 1 : 0.85}
                    >
                      <animateMotion
                        dur={`${dur}s`}
                        begin={`${-offset}s`}
                        repeatCount="indefinite"
                        path={d}
                      />
                    </circle>
                  )
                })}
              </g>
            )
          })}

          {/* Source node */}
          <rect x={SRC_X - 62} y={srcY - 30} width={124} height={60} rx={10}
            fill="hsl(var(--secondary))" stroke="hsl(var(--border))" strokeWidth={1.5} />
          <text x={SRC_X} y={srcY - 10} textAnchor="middle"
            fill="hsl(var(--muted-foreground))" fontSize={10} fontFamily="system-ui">
            TOTAL SPENT
          </text>
          <text x={SRC_X} y={srcY + 12} textAnchor="middle"
            fill="hsl(var(--foreground))" fontSize={15} fontWeight="700" fontFamily="system-ui">
            {formatCurrency(total)}
          </text>

          {/* Category nodes */}
          {nodes.map((n) => {
            const isHov = hovered === n.cat
            return (
              <g key={n.cat}
                onMouseEnter={() => setHovered(n.cat)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Glow halo on hover */}
                {isHov && (
                  <rect x={TGT_X - 8} y={n.y - NODE_H / 2 - 4}
                    width={NODE_W + 16} height={NODE_H + 8} rx={12}
                    fill={n.color} opacity={0.12}
                    filter={`url(#${uid}-softglow)`}
                  />
                )}
                <rect x={TGT_X - 4} y={n.y - NODE_H / 2}
                  width={NODE_W + 8} height={NODE_H} rx={8}
                  fill="hsl(var(--secondary))"
                  stroke={n.color} strokeWidth={isHov ? 2 : 1.5}
                  opacity={isHov ? 1 : 0.85}
                />
                {/* Color dot */}
                <circle cx={TGT_X + 12} cy={n.y} r={4.5} fill={n.color}
                  filter={isHov ? `url(#${uid}-glow)` : undefined}
                />
                {/* Category name */}
                <text x={TGT_X + 23} y={n.y - 4}
                  fill="hsl(var(--muted-foreground))" fontSize={10} fontFamily="system-ui">
                  {n.cat}
                </text>
                {/* Amount */}
                <text x={TGT_X + 23} y={n.y + 10}
                  fill={isHov ? n.color : 'hsl(var(--foreground))'}
                  fontSize={12} fontWeight="700" fontFamily="system-ui">
                  {formatCurrency(n.amount)}
                </text>
                {/* % badge */}
                <text x={TGT_X + NODE_W - 4} y={n.y + 4}
                  textAnchor="end"
                  fill={n.color} fontSize={10} fontWeight="600" fontFamily="system-ui" opacity={0.8}>
                  {(n.pct * 100).toFixed(0)}%
                </text>
              </g>
            )
          })}
          </g>
        </svg>
      </div>

      {hovered && (() => {
        const n = nodes.find((x) => x.cat === hovered)!
        return (
          <div className="mt-2 text-center text-xs text-muted-foreground">
            <span style={{ color: n.color }} className="font-semibold">{n.cat}</span>
            {' · '}
            {formatCurrency(n.amount)}
            {' · '}
            {(n.pct * 100).toFixed(1)}% of total spending
          </div>
        )
      })()}
    </div>
  )
}
