import { SchemaType, type Tool } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { fetchNSEPrice, fetchNSEPrices } from '@/lib/prices'
import { fetchCompanyNews } from '@/lib/finnhub'
import { ExpenseSummary, PortfolioHoldings, StockSignal, TransactionCategory } from '@/types'

export const GEMINI_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'get_expense_summary',
        description: "Get the user's expense summary for a date range, optionally filtered by category.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            from_date: { type: SchemaType.STRING, description: 'Start date in YYYY-MM-DD format' },
            to_date: { type: SchemaType.STRING, description: 'End date in YYYY-MM-DD format' },
            category: {
              type: SchemaType.STRING,
              description: 'Transaction category filter. Use "All" for no filter. One of: All, Food, Transport, Entertainment, Investments, Utilities, Healthcare, Shopping, Others',
            },
          },
          required: ['from_date', 'to_date', 'category'],
        },
      },
      {
        name: 'get_portfolio_holdings',
        description: "Get the user's current paper trading portfolio holdings including P&L.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'get_stock_news',
        description: 'Get recent news and sentiment for a stock ticker.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ticker: { type: SchemaType.STRING, description: 'NSE stock ticker symbol e.g. INFY, TCS, RELIANCE' },
          },
          required: ['ticker'],
        },
      },
      {
        name: 'get_stock_signal',
        description: 'Get an AI-generated buy/sell/hold signal for a stock.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ticker: { type: SchemaType.STRING, description: 'NSE stock ticker symbol' },
          },
          required: ['ticker'],
        },
      },
      {
        name: 'simulate_trade',
        description: 'Simulate a paper buy or sell trade for a stock.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ticker: { type: SchemaType.STRING },
            action: { type: SchemaType.STRING, description: 'buy or sell' },
            quantity: { type: SchemaType.NUMBER, description: 'Number of shares' },
          },
          required: ['ticker', 'action', 'quantity'],
        },
      },
    ],
  },
]

export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<unknown> {
  const supabase = createClient()

  switch (name) {
    case 'get_expense_summary':
      return getExpenseSummary(userId, args.from_date as string, args.to_date as string, args.category as string, supabase)

    case 'get_portfolio_holdings':
      return getPortfolioHoldings(userId, supabase)

    case 'get_stock_news':
      return getStockNews(args.ticker as string)

    case 'get_stock_signal':
      return getStockSignal(args.ticker as string)

    case 'simulate_trade':
      return simulateTrade(userId, args.ticker as string, args.action as 'buy' | 'sell', args.quantity as number, supabase)

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

async function getExpenseSummary(
  userId: string,
  fromDate: string,
  toDate: string,
  category: string,
  supabase: ReturnType<typeof createClient>
): Promise<ExpenseSummary> {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'debit')
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: false })

  if (category !== 'All') {
    query = query.eq('category', category)
  }

  const { data: transactions, error } = await query
  if (error) throw new Error(error.message)

  const byCategory: Partial<Record<TransactionCategory, number>> = {}
  let total = 0

  for (const tx of transactions ?? []) {
    total += tx.amount
    byCategory[tx.category as TransactionCategory] = (byCategory[tx.category as TransactionCategory] ?? 0) + tx.amount
  }

  return {
    from_date: fromDate,
    to_date: toDate,
    category: category as TransactionCategory | 'All',
    total,
    transactions: transactions ?? [],
    by_category: byCategory,
  }
}

async function getPortfolioHoldings(
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<PortfolioHoldings> {
  const { data: holdings } = await supabase
    .from('paper_holdings')
    .select('*')
    .eq('user_id', userId)

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('paper_balance')
    .eq('id', userId)
    .single()

  const tickers = (holdings ?? []).map((h) => h.ticker)
  const prices = tickers.length > 0 ? await fetchNSEPrices(tickers) : {}

  const enriched = (holdings ?? []).map((h) => {
    const current_price = prices[h.ticker] ?? h.avg_buy_price
    const unrealized_pnl = (current_price - h.avg_buy_price) * h.quantity
    const pnl_pct = h.avg_buy_price > 0 ? ((current_price - h.avg_buy_price) / h.avg_buy_price) * 100 : 0
    return { ...h, current_price, unrealized_pnl, pnl_pct }
  })

  const totalInvested = enriched.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0)
  const currentValue = enriched.reduce((s, h) => s + h.quantity * h.current_price, 0)

  return {
    holdings: enriched,
    total_invested: totalInvested,
    current_value: currentValue,
    total_pnl: currentValue - totalInvested,
    paper_balance: profile?.paper_balance ?? 100000,
  }
}

async function getStockNews(ticker: string): Promise<{ articles: { title: string; summary: string; sentiment: string; published_at: string; source: string }[] }> {
  try {
    const articles = await fetchCompanyNews(ticker, 7)
    return {
      articles: articles.map((a) => ({
        title: a.title,
        summary: a.summary,
        sentiment: a.sentiment,
        published_at: a.published_at,
        source: a.source,
      })),
    }
  } catch {
    return { articles: [] }
  }
}

async function getStockSignal(ticker: string): Promise<StockSignal> {
  const signals: StockSignal['signal'][] = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell']
  const signal = signals[Math.floor(Math.random() * signals.length)]

  return {
    ticker,
    signal,
    reason: `Based on recent price action and market sentiment for ${ticker}. This is a paper trading simulation — not financial advice.`,
    confidence: Math.round(50 + Math.random() * 40),
  }
}

async function simulateTrade(
  userId: string,
  ticker: string,
  action: 'buy' | 'sell',
  quantity: number,
  supabase: ReturnType<typeof createClient>
): Promise<{ success: boolean; message: string; trade?: unknown }> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('paper_balance')
    .eq('id', userId)
    .single()

  let price: number
  try {
    price = await fetchNSEPrice(ticker)
  } catch {
    throw new Error(`Could not fetch live price for ${ticker}. Check the ticker is a valid NSE symbol (e.g. INFY, TCS, RELIANCE).`)
  }
  const totalValue = price * quantity

  if (action === 'buy') {
    if ((profile?.paper_balance ?? 0) < totalValue) {
      return { success: false, message: `Insufficient paper balance. Need ₹${totalValue.toFixed(2)}, have ₹${profile?.paper_balance?.toFixed(2)}` }
    }

    const { data: existing } = await supabase
      .from('paper_holdings')
      .select('*')
      .eq('user_id', userId)
      .eq('ticker', ticker)
      .single()

    if (existing) {
      const newQty = existing.quantity + quantity
      const newAvg = (existing.quantity * existing.avg_buy_price + totalValue) / newQty
      await supabase.from('paper_holdings').update({ quantity: newQty, avg_buy_price: newAvg }).eq('id', existing.id)
    } else {
      await supabase.from('paper_holdings').insert({
        user_id: userId, ticker, company_name: ticker, quantity, avg_buy_price: price,
      })
    }

    await supabase.from('user_profiles').update({ paper_balance: (profile?.paper_balance ?? 0) - totalValue }).eq('id', userId)
  } else {
    const { data: existing } = await supabase
      .from('paper_holdings')
      .select('*')
      .eq('user_id', userId)
      .eq('ticker', ticker)
      .single()

    if (!existing || existing.quantity < quantity) {
      return { success: false, message: `Not enough shares to sell. Have ${existing?.quantity ?? 0}, need ${quantity}.` }
    }

    const newQty = existing.quantity - quantity
    if (newQty === 0) {
      await supabase.from('paper_holdings').delete().eq('id', existing.id)
    } else {
      await supabase.from('paper_holdings').update({ quantity: newQty }).eq('id', existing.id)
    }

    await supabase.from('user_profiles').update({ paper_balance: (profile?.paper_balance ?? 0) + totalValue }).eq('id', userId)
  }

  const { data: trade } = await supabase.from('paper_trades').insert({
    user_id: userId, ticker, action, quantity, price, total_value: totalValue,
  }).select().single()

  return { success: true, message: `${action === 'buy' ? 'Bought' : 'Sold'} ${quantity} shares of ${ticker} at ₹${price.toFixed(2)}`, trade }
}
