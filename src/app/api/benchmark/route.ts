import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface TradeRow {
  action: string
  ticker: string
  quantity: number
  price: number
  created_at: string
}

async function fetchNiftyHistory(days: number): Promise<{ date: string; close: number }[]> {
  const end = Math.floor(Date.now() / 1000)
  const start = end - days * 86400
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&period1=${start}&period2=${end}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const json = await res.json()
    const result = json?.chart?.result?.[0]
    const timestamps: number[] = result?.timestamp ?? []
    const closes: number[] = result?.indicators?.quote?.[0]?.close ?? []
    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      close: closes[i] ?? 0,
    })).filter((d) => d.close > 0)
  } catch {
    return []
  }
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: trades }, niftyHistory] = await Promise.all([
    supabase
      .from('paper_trades')
      .select('action, ticker, quantity, price, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    fetchNiftyHistory(90),
  ])

  if (!trades?.length || !niftyHistory.length) {
    return NextResponse.json({ points: [] })
  }

  // Build cumulative portfolio value at each trade date
  const holdings: Record<string, number> = {}
  const cashStart = 100000
  let cash = cashStart

  const portfolioByDate: Record<string, number> = {}

  for (const trade of trades as TradeRow[]) {
    const date = trade.created_at.split('T')[0]
    if (trade.action === 'buy') {
      holdings[trade.ticker] = (holdings[trade.ticker] ?? 0) + trade.quantity
      cash -= trade.price * trade.quantity
    } else {
      holdings[trade.ticker] = Math.max(0, (holdings[trade.ticker] ?? 0) - trade.quantity)
      cash += trade.price * trade.quantity
    }
    // Portfolio value = cash + invested (at trade prices as approximation)
    const invested = Object.entries(holdings).reduce((s, [, qty]) => s + qty * trade.price, 0)
    portfolioByDate[date] = cash + invested
  }

  // Fill in dates from nifty history
  const niftyStart = niftyHistory[0]?.close ?? 1
  const portfolioStart = cashStart

  const points = niftyHistory.map((n) => {
    const portfolioValue = portfolioByDate[n.date] ?? null
    return {
      date: n.date,
      nifty: Math.round((n.close / niftyStart) * 100 * 100) / 100,
      portfolio: portfolioValue !== null
        ? Math.round((portfolioValue / portfolioStart) * 100 * 100) / 100
        : null,
    }
  })

  return NextResponse.json({ points })
}
