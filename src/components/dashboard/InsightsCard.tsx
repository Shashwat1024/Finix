import { Transaction, TransactionCategory, RiskProfile } from '@/types'
import { CATEGORY_COLORS, formatCurrency } from '@/lib/utils'
import { Lightbulb, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react'

interface Props {
  transactions: Transaction[]
  riskProfile: RiskProfile
}

export default function InsightsCard({ transactions, riskProfile }: Props) {
  const byCategory: Partial<Record<TransactionCategory, number>> = {}
  for (const tx of transactions) {
    byCategory[tx.category] = (byCategory[tx.category] ?? 0) + tx.amount
  }

  const total = Object.values(byCategory).reduce((s, v) => s + v, 0)
  const top3 = Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 3)

  type Insight = { icon: typeof Lightbulb; text: string; tone: 'neutral' | 'warn' | 'good' }
  const insights: Insight[] = []

  if (top3[0]) {
    insights.push({
      icon: TrendingUp,
      text: `${top3[0][0]} is your biggest spend at ${formatCurrency(top3[0][1])}`,
      tone: 'neutral',
    })
  }

  if (total > 0 && byCategory['Food']) {
    const pct = (byCategory['Food']! / total) * 100
    if (pct > 30) {
      insights.push({
        icon: AlertCircle,
        text: `Food is ${pct.toFixed(0)}% of spending — consider meal prepping to save`,
        tone: 'warn',
      })
    }
  }

  if (byCategory['Investments'] && total > 0) {
    const pct = (byCategory['Investments']! / total) * 100
    insights.push({
      icon: TrendingUp,
      text: `You invested ${pct.toFixed(0)}% of spend this month — great habit`,
      tone: 'good',
    })
  } else if (riskProfile !== 'conservative') {
    insights.push({
      icon: TrendingDown,
      text: 'No investment transactions yet — consider setting up a SIP',
      tone: 'warn',
    })
  }

  if (insights.length === 0) {
    insights.push({
      icon: Lightbulb,
      text: 'Sync your DHAN account to see personalised insights',
      tone: 'neutral',
    })
  }

  const toneStyles = {
    neutral: 'border-primary/40 text-foreground',
    warn: 'border-yellow-500/50 text-yellow-300',
    good: 'border-green-500/50 text-green-400',
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb className="h-4 w-4 text-yellow-400" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Insights</h2>
      </div>

      <div className="mt-4 space-y-3">
        {insights.map((ins, i) => {
          const Icon = ins.icon
          return (
            <div key={i} className={`flex gap-3 border-l-2 pl-3 ${toneStyles[ins.tone]}`}>
              <Icon className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
              <p className="text-xs leading-relaxed">{ins.text}</p>
            </div>
          )
        })}
      </div>

      {top3.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Top categories</p>
          {top3.map(([cat, amount]) => {
            const pct = total > 0 ? (amount / total) * 100 : 0
            const color = CATEGORY_COLORS[cat as TransactionCategory]
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{cat}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
