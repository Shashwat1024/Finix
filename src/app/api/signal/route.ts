import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchNSEPrice } from '@/lib/prices'

const SIGNALS = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'] as const
type Signal = typeof SIGNALS[number]

function priceToSignal(price: number, prev: number): Signal {
  const change = ((price - prev) / prev) * 100
  if (change > 2) return 'Strong Buy'
  if (change > 0.5) return 'Buy'
  if (change > -0.5) return 'Hold'
  if (change > -2) return 'Sell'
  return 'Strong Sell'
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ticker = request.nextUrl.searchParams.get('ticker')
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  try {
    const price = await fetchNSEPrice(ticker)
    // Simulate previous close with ±3% variance for demo
    const prevClose = price * (1 + (Math.random() * 0.06 - 0.03))
    const signal = priceToSignal(price, prevClose)
    const change = ((price - prevClose) / prevClose) * 100

    return NextResponse.json({
      ticker,
      price,
      change: Math.round(change * 100) / 100,
      signal,
      reason: signalReason(signal, ticker),
    })
  } catch {
    return NextResponse.json({ error: 'Price unavailable' }, { status: 502 })
  }
}

function signalReason(signal: Signal, ticker: string): string {
  const reasons: Record<Signal, string> = {
    'Strong Buy': `${ticker} showing strong upward momentum. Consider accumulating.`,
    'Buy': `${ticker} trending positive. Good entry point for long-term investors.`,
    'Hold': `${ticker} trading sideways. Hold existing positions and monitor.`,
    'Sell': `${ticker} showing weakness. Consider booking partial profits.`,
    'Strong Sell': `${ticker} under significant selling pressure. Review your position.`,
  }
  return reasons[signal]
}
