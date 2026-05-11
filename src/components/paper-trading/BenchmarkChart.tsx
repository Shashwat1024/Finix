'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'

interface Point {
  date: string
  nifty: number
  portfolio: number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="text-muted-foreground">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(2)}%
        </p>
      ))}
    </div>
  )
}

export default function BenchmarkChart() {
  const [points, setPoints] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/benchmark')
      .then((r) => r.json())
      .then((d) => setPoints(d.points ?? []))
      .finally(() => setLoading(false))
  }, [])

  const hasPortfolio = points.some((p) => p.portfolio !== null)

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 animate-pulse">
        <div className="h-4 w-40 bg-secondary rounded mb-4" />
        <div className="h-48 bg-secondary/50 rounded" />
      </div>
    )
  }

  if (!points.length) return null

  // Convert to indexed return (0 = baseline)
  const displayPoints = points.map((p) => ({
    ...p,
    nifty: p.nifty - 100,
    portfolio: p.portfolio !== null ? p.portfolio - 100 : null,
  }))

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Portfolio vs Nifty 50
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Indexed return (%) over last 90 days</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={displayPoints} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v) => {
              const d = new Date(v)
              return `${d.getDate()}/${d.getMonth() + 1}`
            }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="nifty"
            name="Nifty 50"
            stroke="#94a3b8"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
          {hasPortfolio && (
            <Line
              type="monotone"
              dataKey="portfolio"
              name="My Portfolio"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {!hasPortfolio && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Make paper trades to see your portfolio vs Nifty
        </p>
      )}
    </div>
  )
}
