import { createClient } from '@/lib/supabase/server'
import SpendTrendChart from './SpendTrendChart'

interface Props {
  userId: string
}

export default async function SpendTrend({ userId }: Props) {
  const supabase = createClient()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  const fromDate = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1).toISOString().split('T')[0]

  const { data: txs } = await supabase
    .from('transactions')
    .select('date, amount, category')
    .eq('user_id', userId)
    .eq('type', 'debit')
    .gte('date', fromDate)

  // Aggregate by month
  const byMonth: Record<string, number> = {}
  for (const tx of txs ?? []) {
    const month = tx.date.slice(0, 7)
    byMonth[month] = (byMonth[month] ?? 0) + tx.amount
  }

  const chartData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month: new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(new Date(month + '-01')),
      total: Math.round(total),
    }))

  const total = Object.values(byMonth).reduce((s, v) => s + v, 0)
  const avg = Object.keys(byMonth).length > 0 ? total / Object.keys(byMonth).length : 0

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Spend Trend
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
        </div>
        {avg > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Monthly avg</p>
            <p className="text-sm font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(avg)}</p>
          </div>
        )}
      </div>
      <SpendTrendChart data={chartData} />
    </div>
  )
}
