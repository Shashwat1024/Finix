'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface Props {
  data: { month: string; total: number }[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export default function SpendTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-12">
        No data yet. Sync your transactions.
      </p>
    )
  }

  const max = Math.max(...data.map((d) => d.total))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          dy={6}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--border))', opacity: 0.4 }} />
        <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {data.map((entry) => (
            <Cell
              key={entry.month}
              fill={
                entry.total === max
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--primary) / 0.45)'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
