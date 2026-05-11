import { cn, formatCurrency } from '@/lib/utils'

interface EnrichedHolding {
  id: string
  ticker: string
  quantity: number
  avg_buy_price: number
  current_price: number
  unrealized_pnl: number
  pnl_pct: number
}

interface Props {
  items: EnrichedHolding[]
}

export default function Holdings({ items }: Props) {
  const totalInvested = items.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0)
  const currentValue = items.reduce((s, h) => s + h.quantity * h.current_price, 0)
  const totalPnl = currentValue - totalInvested

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Holdings</h2>
        {items.length > 0 && (
          <span className={cn('text-xs font-medium', totalPnl >= 0 ? 'text-green-400' : 'text-red-400')}>
            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No holdings yet. Execute a paper trade to get started.</p>
      ) : (
        <div className="space-y-2">
          {items.map((h) => (
            <div key={h.id} className="rounded-md bg-secondary px-3 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{h.ticker}</p>
                <p className="text-xs text-muted-foreground">
                  {h.quantity} shares · avg {formatCurrency(h.avg_buy_price)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(h.quantity * h.current_price)}</p>
                <p className={cn('text-xs font-medium', h.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {h.pnl_pct >= 0 ? '+' : ''}{h.pnl_pct.toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
