import { createClient } from '@/lib/supabase/server'
import { fetchNSEPrices } from '@/lib/prices'
import ExpenseDonut from '@/components/dashboard/ExpenseDonut'
import SpendTrend from '@/components/dashboard/SpendTrend'
import PortfolioSnapshot from '@/components/dashboard/PortfolioSnapshot'
import InsightsCard from '@/components/dashboard/InsightsCard'
import SyncButton from '@/components/dashboard/SyncButton'
import SeedButton from '@/components/dashboard/SeedButton'
import MoneyFlow from '@/components/dashboard/MoneyFlow'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .eq('type', 'debit')
    .gte('date', monthStart)
    .lte('date', monthEnd)

  const { data: holdings } = await supabase
    .from('paper_holdings')
    .select('*')
    .eq('user_id', user!.id)

  const tickers = (holdings ?? []).map((h) => h.ticker)
  const livePrices = tickers.length > 0 ? await fetchNSEPrices(tickers) : {}

  const enrichedHoldings = (holdings ?? []).map((h) => {
    const currentPrice = livePrices[h.ticker] ?? h.avg_buy_price
    const currentValue = currentPrice * h.quantity
    const costBasis = h.avg_buy_price * h.quantity
    return {
      ...h,
      current_price: currentPrice,
      current_value: currentValue,
      unrealized_pnl: currentValue - costBasis,
      pnl_pct: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0,
    }
  })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('paper_balance, risk_profile, dhan_token_encrypted')
    .eq('id', user!.id)
    .single()

  const hasDhanToken = !!profile?.dhan_token_encrypted

  return (
    <div className="space-y-6">
      {!hasDhanToken && (
        <div className="flex items-center justify-between rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
          <span className="text-yellow-300">
            No DHAN token configured — sync is disabled.
          </span>
          <a href="/settings" className="font-semibold text-yellow-300 underline underline-offset-2 hover:text-yellow-200">
            Add token →
          </a>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(now)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(transactions ?? []).length === 0 && <SeedButton />}
          <SyncButton />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ExpenseDonut transactions={transactions ?? []} />
        <PortfolioSnapshot holdings={enrichedHoldings} paperBalance={profile?.paper_balance ?? 100000} />
        <InsightsCard transactions={transactions ?? []} riskProfile={profile?.risk_profile ?? 'moderate'} />
      </div>

      <MoneyFlow transactions={transactions ?? []} />
      <SpendTrend userId={user!.id} />
    </div>
  )
}
