import { createClient } from '@/lib/supabase/server'
import NewsFeed from '@/components/news/NewsFeed'

export default async function NewsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: watchlist } = await supabase
    .from('watchlist')
    .select('ticker')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })

  const tickers = (watchlist ?? []).map((w) => w.ticker)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Market News</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Powered by Finnhub · cached every 6 hours
        </p>
      </div>
      <NewsFeed watchlistTickers={tickers} />
    </div>
  )
}
