import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCompanyNews } from '@/lib/finnhub'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ticker = request.nextUrl.searchParams.get('ticker')
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  const key = ticker.toUpperCase()

  // Check 6h cache
  const { data: cached } = await supabase
    .from('news_cache')
    .select('articles, fetched_at')
    .eq('ticker', key)
    .single()

  const cacheAge = cached ? Date.now() - new Date(cached.fetched_at).getTime() : Infinity

  if (cached && cacheAge < CACHE_TTL_MS) {
    return NextResponse.json({
      articles: cached.articles,
      cached: true,
      age_minutes: Math.round(cacheAge / 60000),
    })
  }

  const articles = await fetchCompanyNews(key)

  await supabase.from('news_cache').upsert({
    ticker: key,
    articles,
    fetched_at: new Date().toISOString(),
  })

  return NextResponse.json({ articles, cached: false })
}
