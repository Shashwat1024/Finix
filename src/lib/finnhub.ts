const FINNHUB_BASE = 'https://finnhub.io/api/v1'

export interface FinnhubArticle {
  title: string
  summary: string
  sentiment: 'positive' | 'negative' | 'neutral'
  published_at: string
  url: string
  source: string
  image: string
}

function detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase()
  const pos = ['surge', 'rally', 'gain', 'rise', 'profit', 'growth', 'bullish', 'beat', 'strong', 'soar', 'record', 'upgrade']
  const neg = ['fall', 'drop', 'loss', 'decline', 'bearish', 'weak', 'miss', 'crash', 'slump', 'sell-off', 'downgrade', 'concern']
  const posScore = pos.filter((w) => lower.includes(w)).length
  const negScore = neg.filter((w) => lower.includes(w)).length
  if (posScore > negScore) return 'positive'
  if (negScore > posScore) return 'negative'
  return 'neutral'
}

// NSE ticker → Finnhub symbol (NSE:TICKER)
export function toFinnhubSymbol(ticker: string): string {
  return `NSE:${ticker.toUpperCase()}`
}

interface RawFinnhubArticle {
  headline: string
  summary: string
  datetime: number
  url: string
  source: string
  image: string
}

function mapArticle(a: RawFinnhubArticle): FinnhubArticle {
  return {
    title: a.headline ?? '',
    summary: a.summary ?? '',
    sentiment: detectSentiment((a.headline ?? '') + ' ' + (a.summary ?? '')),
    published_at: new Date((a.datetime ?? 0) * 1000).toISOString(),
    url: a.url ?? '',
    source: a.source ?? '',
    image: a.image ?? '',
  }
}

export async function fetchCompanyNews(ticker: string, days = 7): Promise<FinnhubArticle[]> {
  const apiKey = process.env.FINNHUB_KEY
  if (!apiKey) return []

  const to = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - days * 86400_000).toISOString().split('T')[0]
  const symbol = toFinnhubSymbol(ticker)

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${apiKey}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return await fallbackNewsAPI(ticker)
    const data: RawFinnhubArticle[] = await res.json()
    if (!Array.isArray(data) || data.length === 0) return await fallbackNewsAPI(ticker)
    return data.slice(0, 8).map(mapArticle)
  } catch {
    return fallbackNewsAPI(ticker)
  }
}

export async function fetchMarketNews(): Promise<FinnhubArticle[]> {
  const apiKey = process.env.FINNHUB_KEY
  if (!apiKey) return []

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/news?category=general&token=${apiKey}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data: RawFinnhubArticle[] = await res.json()
    if (!Array.isArray(data)) return []
    // Filter for India-relevant headlines
    const indiaKeywords = ['india', 'nse', 'bse', 'sensex', 'nifty', 'rbi', 'sebi', 'rupee']
    const filtered = data.filter((a) =>
      indiaKeywords.some((kw) =>
        (a.headline + ' ' + a.summary).toLowerCase().includes(kw)
      )
    )
    // Return filtered if we have enough, otherwise return top general
    const pool = filtered.length >= 5 ? filtered : data
    return pool.slice(0, 10).map(mapArticle)
  } catch {
    return []
  }
}

// NewsAPI fallback when Finnhub has no coverage for a ticker
async function fallbackNewsAPI(ticker: string): Promise<FinnhubArticle[]> {
  const apiKey = process.env.NEWSAPI_KEY
  if (!apiKey) return []

  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(ticker + ' NSE India')}&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json.articles ?? []).map((a: { title: string; description: string; publishedAt: string; url: string; source: { name: string } }) => ({
      title: a.title ?? '',
      summary: a.description ?? '',
      sentiment: detectSentiment((a.title ?? '') + ' ' + (a.description ?? '')),
      published_at: a.publishedAt ?? new Date().toISOString(),
      url: a.url ?? '',
      source: a.source?.name ?? '',
      image: '',
    }))
  } catch {
    return []
  }
}
