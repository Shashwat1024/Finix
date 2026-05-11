import { createClient } from '@/lib/supabase/server'
import { fetchNSEPrices } from '@/lib/prices'
import ConstellationWatchlist from '@/components/paper-trading/ConstellationWatchlist'
import Holdings from '@/components/paper-trading/Holdings'
import ParticlePortfolio from '@/components/paper-trading/ParticlePortfolio'
import TradeLog from '@/components/paper-trading/TradeLog'
import BenchmarkChart from '@/components/paper-trading/BenchmarkChart'

export default async function PaperTradingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: watchlist },
    { data: holdings },
    { data: trades },
    { data: profile },
  ] = await Promise.all([
    supabase.from('watchlist').select('*').eq('user_id', user!.id),
    supabase.from('paper_holdings').select('*').eq('user_id', user!.id),
    supabase.from('paper_trades').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('user_profiles').select('paper_balance').eq('id', user!.id).single(),
  ])

  const tickers = (holdings ?? []).map((h) => h.ticker)
  const prices = tickers.length > 0 ? await fetchNSEPrices(tickers) : {}

  const enrichedHoldings = (holdings ?? []).map((h) => {
    const current_price = prices[h.ticker] ?? h.avg_buy_price
    const unrealized_pnl = (current_price - h.avg_buy_price) * h.quantity
    const pnl_pct = h.avg_buy_price > 0 ? ((current_price - h.avg_buy_price) / h.avg_buy_price) * 100 : 0
    return { ...h, current_price, unrealized_pnl, pnl_pct }
  })

  const currentValue = enrichedHoldings.reduce((s, h) => s + h.quantity * h.current_price, 0)
  const paperBalance = profile?.paper_balance ?? 100000

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paper Trading</h1>
        <p className="text-muted-foreground text-sm mt-1 flex flex-wrap gap-4">
          <span>Cash: <span className="text-green-400 font-semibold">₹{paperBalance.toLocaleString('en-IN')}</span></span>
          {enrichedHoldings.length > 0 && (
            <span>Portfolio: <span className="font-semibold">₹{currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></span>
          )}
        </p>
      </div>

      {/* Constellation + Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConstellationWatchlist items={watchlist ?? []} userId={user!.id} />
        <Holdings items={enrichedHoldings} />
      </div>

      {/* Particle Portfolio + Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ParticlePortfolio holdings={enrichedHoldings} paperBalance={paperBalance} />
        <BenchmarkChart />
      </div>

      <TradeLog trades={trades ?? []} />
    </div>
  )
}
