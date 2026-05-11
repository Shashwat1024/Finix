const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

interface YahooResponse {
  chart: {
    result: Array<{ meta: { regularMarketPrice: number; currency: string } }> | null
    error: { code: string; description: string } | null
  }
}

export async function fetchNSEPrice(ticker: string): Promise<number> {
  const symbol = ticker.endsWith('.NS') ? ticker : `${ticker}.NS`

  const res = await fetch(`${YAHOO_BASE}/${symbol}?interval=1d&range=1d`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 60 }, // cache 60s — avoids hammering Yahoo per page render
  })

  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status} for ${symbol}`)

  const data: YahooResponse = await res.json()

  if (data.chart.error) throw new Error(`Yahoo Finance error: ${data.chart.error.description}`)

  const price = data.chart.result?.[0]?.meta?.regularMarketPrice
  if (!price) throw new Error(`No price data for ${symbol}`)

  return price
}

export async function fetchNSEPrices(tickers: string[]): Promise<Record<string, number>> {
  const results = await Promise.allSettled(tickers.map((t) => fetchNSEPrice(t)))
  const prices: Record<string, number> = {}
  tickers.forEach((ticker, i) => {
    const r = results[i]
    if (r.status === 'fulfilled') prices[ticker] = r.value
  })
  return prices
}
