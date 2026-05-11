import { PaperTrade } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  trades: PaperTrade[]
}

export default function TradeLog({ trades }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Trade Log</h2>

      {trades.length === 0 ? (
        <p className="text-muted-foreground text-sm">No trades yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Ticker</th>
                <th className="pb-2 pr-4">Action</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Price</th>
                <th className="pb-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trades.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 pr-4 text-muted-foreground">{formatDate(t.created_at)}</td>
                  <td className="py-2 pr-4 font-semibold">{t.ticker}</td>
                  <td className="py-2 pr-4">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium',
                      t.action === 'buy' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                    )}>
                      {t.action.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{t.quantity}</td>
                  <td className="py-2 pr-4">{formatCurrency(t.price)}</td>
                  <td className="py-2">{formatCurrency(t.total_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
