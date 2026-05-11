import { PaperHolding } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnrichedHolding extends PaperHolding {
  current_price: number
  current_value: number
  unrealized_pnl: number
  pnl_pct: number
}

interface Props {
  holdings: EnrichedHolding[]
  paperBalance: number
}

export default function PortfolioSnapshot({ holdings, paperBalance }: Props) {
  const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0)
  const totalCurrentValue = holdings.reduce((s, h) => s + h.current_value, 0)
  const totalPnl = totalCurrentValue - totalInvested
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
  const totalValue = paperBalance + totalCurrentValue

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 text-green-400" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Paper Portfolio
        </h2>
      </div>

      <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
      {holdings.length > 0 && (
        <div className={cn('flex items-center gap-1 text-xs mb-3 mt-0.5', totalPnl >= 0 ? 'text-green-400' : 'text-red-400')}>
          {totalPnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)} ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%) unrealized</span>
        </div>
      )}
      {holdings.length === 0 && <div className="mb-4" />}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-md bg-secondary/60 p-3">
          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
            <Wallet className="h-3 w-3" /> Cash
          </p>
          <p className="text-sm font-semibold text-green-400">{formatCurrency(paperBalance)}</p>
        </div>
        <div className="rounded-md bg-secondary/60 p-3">
          <p className="text-xs text-muted-foreground mb-0.5">Holdings</p>
          <p className="text-sm font-semibold">{formatCurrency(totalCurrentValue)}</p>
        </div>
      </div>

      {holdings.length === 0 ? (
        <p className="text-xs text-muted-foreground">No holdings yet. Use Paper Trading to buy stocks.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Top holdings</p>
          {holdings.slice(0, 3).map((h) => (
            <div key={h.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-[10px] font-bold text-primary">
                  {h.ticker.slice(0, 2)}
                </span>
                <div>
                  <p className="text-xs font-semibold">{h.ticker}</p>
                  <p className="text-[10px] text-muted-foreground">{h.quantity} shares · ₹{h.current_price.toFixed(0)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">{formatCurrency(h.current_value)}</p>
                <p className={cn('text-[10px]', h.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {h.unrealized_pnl >= 0 ? '+' : ''}{h.pnl_pct.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
          {holdings.length > 3 && (
            <p className="text-[10px] text-muted-foreground">+{holdings.length - 3} more</p>
          )}
        </div>
      )}
    </div>
  )
}
