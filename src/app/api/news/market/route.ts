import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchMarketNews } from '@/lib/finnhub'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cached } = await supabase
    .from('news_cache')
    .select('articles, fetched_at')
    .eq('ticker', '__market__')
    .single()

  const cacheAge = cached ? Date.now() - new Date(cached.fetched_at).getTime() : Infinity

  if (cached && cacheAge < CACHE_TTL_MS) {
    return NextResponse.json({
      articles: cached.articles,
      cached: true,
      age_minutes: Math.round(cacheAge / 60000),
    })
  }

  const articles = await fetchMarketNews()

  await supabase.from('news_cache').upsert({
    ticker: '__market__',
    articles,
    fetched_at: new Date().toISOString(),
  })

  return NextResponse.json({ articles, cached: false })
}
