'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Transaction, TransactionCategory } from '@/types'
import { CATEGORY_COLORS, formatCurrency } from '@/lib/utils'

interface Props {
  transactions: Transaction[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-0.5">{name}</p>
      <p className="text-sm font-semibold">{formatCurrency(value)}</p>
    </div>
  )
}

export default function ExpenseDonut({ transactions }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const byCategory: Partial<Record<TransactionCategory, number>> = {}
  for (const tx of transactions) {
    byCategory[tx.category] = (byCategory[tx.category] ?? 0) + tx.amount
  }

  const data = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((s, d) => s + d.value, 0)
  const active = hovered !== null ? data[hovered] : null

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        This Month&apos;s Spending
      </h2>

      {data.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">No transactions yet.</p>
      ) : (
        <>
          <p className="text-2xl font-bold mb-2">{formatCurrency(total)}</p>

          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={82}
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                  onMouseEnter={(_, index) => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={CATEGORY_COLORS[entry.name as TransactionCategory] ?? '#94a3b8'}
                      opacity={hovered === null || hovered === index ? 1 : 0.4}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                {active ? (
                  <>
                    <p className="text-[11px] text-muted-foreground leading-tight">{active.name}</p>
                    <p className="text-sm font-bold leading-tight">{formatCurrency(active.value)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-muted-foreground leading-tight">Total</p>
                    <p className="text-sm font-bold leading-tight">{formatCurrency(total)}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-2 space-y-2">
            {data.map((entry, i) => {
              const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0'
              const color = CATEGORY_COLORS[entry.name as TransactionCategory] ?? '#94a3b8'
              return (
                <button
                  key={entry.name}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  className="flex items-center justify-between w-full text-left group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className={`text-xs transition-colors ${hovered === i ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                    <span className="text-xs font-medium tabular-nums w-20 text-right">{formatCurrency(entry.value)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
