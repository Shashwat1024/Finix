import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Transactions (last 90 days) ──────────────────────────
  const transactions = [
    // Food
    { narration: 'Swiggy Order #SW8821', amount: 312, type: 'debit', category: 'Food', days: 2 },
    { narration: 'Zomato Order #ZM4421', amount: 245, type: 'debit', category: 'Food', days: 5 },
    { narration: 'Barbeque Nation', amount: 1850, type: 'debit', category: 'Food', days: 11 },
    { narration: 'Swiggy Order #SW9012', amount: 189, type: 'debit', category: 'Food', days: 18 },
    { narration: 'Cafe Coffee Day', amount: 420, type: 'debit', category: 'Food', days: 22 },
    { narration: 'Dominos Pizza', amount: 598, type: 'debit', category: 'Food', days: 31 },
    { narration: 'Zomato Order #ZM6634', amount: 275, type: 'debit', category: 'Food', days: 38 },
    { narration: 'Swiggy Order #SW7743', amount: 340, type: 'debit', category: 'Food', days: 45 },
    { narration: 'Paradise Biryani', amount: 760, type: 'debit', category: 'Food', days: 52 },
    { narration: 'McDonalds', amount: 385, type: 'debit', category: 'Food', days: 60 },
    { narration: 'Zomato Order #ZM8812', amount: 210, type: 'debit', category: 'Food', days: 67 },
    { narration: 'Swiggy Order #SW5521', amount: 430, type: 'debit', category: 'Food', days: 74 },
    { narration: 'KFC Outlet', amount: 650, type: 'debit', category: 'Food', days: 82 },

    // Transport
    { narration: 'Uber Trip UBXXXXXX', amount: 189, type: 'debit', category: 'Transport', days: 1 },
    { narration: 'Rapido Bike RPXXXXXX', amount: 55, type: 'debit', category: 'Transport', days: 4 },
    { narration: 'Ola Cab OLXXXXXX', amount: 234, type: 'debit', category: 'Transport', days: 8 },
    { narration: 'IRCTC TKT #PNR884421', amount: 1245, type: 'debit', category: 'Transport', days: 14 },
    { narration: 'Uber Trip UBXXXXXX', amount: 145, type: 'debit', category: 'Transport', days: 20 },
    { narration: 'FASTag Recharge', amount: 500, type: 'debit', category: 'Transport', days: 28 },
    { narration: 'Ola Cab OLXXXXXX', amount: 312, type: 'debit', category: 'Transport', days: 35 },
    { narration: 'Petrol Pump HPCL', amount: 3000, type: 'debit', category: 'Transport', days: 42 },
    { narration: 'Uber Trip UBXXXXXX', amount: 210, type: 'debit', category: 'Transport', days: 50 },
    { narration: 'Metro Recharge', amount: 200, type: 'debit', category: 'Transport', days: 58 },

    // Entertainment
    { narration: 'Netflix Subscription', amount: 649, type: 'debit', category: 'Entertainment', days: 3 },
    { narration: 'Spotify Premium', amount: 119, type: 'debit', category: 'Entertainment', days: 3 },
    { narration: 'PVR Cinemas #BK9921', amount: 840, type: 'debit', category: 'Entertainment', days: 16 },
    { narration: 'Amazon Prime Video', amount: 299, type: 'debit', category: 'Entertainment', days: 30 },
    { narration: 'Hotstar Annual Plan', amount: 499, type: 'debit', category: 'Entertainment', days: 62 },
    { narration: 'INOX Movies #BK3312', amount: 720, type: 'debit', category: 'Entertainment', days: 75 },

    // Investments
    { narration: 'Zerodha SIP NIFTY50 ETF', amount: 5000, type: 'debit', category: 'Investments', days: 1 },
    { narration: 'Groww MF SIP ELSS', amount: 3000, type: 'debit', category: 'Investments', days: 1 },
    { narration: 'Zerodha SIP NIFTY50 ETF', amount: 5000, type: 'debit', category: 'Investments', days: 31 },
    { narration: 'Groww MF SIP ELSS', amount: 3000, type: 'debit', category: 'Investments', days: 31 },
    { narration: 'Zerodha SIP NIFTY50 ETF', amount: 5000, type: 'debit', category: 'Investments', days: 61 },
    { narration: 'Groww MF SIP ELSS', amount: 3000, type: 'debit', category: 'Investments', days: 61 },
    { narration: 'LIC Premium Payment', amount: 12000, type: 'debit', category: 'Investments', days: 45 },

    // Utilities
    { narration: 'Jio Postpaid Bill', amount: 399, type: 'debit', category: 'Utilities', days: 7 },
    { narration: 'Airtel Broadband Bill', amount: 999, type: 'debit', category: 'Utilities', days: 7 },
    { narration: 'BESCOM Electricity Bill', amount: 1840, type: 'debit', category: 'Utilities', days: 12 },
    { narration: 'Jio Postpaid Bill', amount: 399, type: 'debit', category: 'Utilities', days: 37 },
    { narration: 'Airtel Broadband Bill', amount: 999, type: 'debit', category: 'Utilities', days: 37 },
    { narration: 'BESCOM Electricity Bill', amount: 2120, type: 'debit', category: 'Utilities', days: 42 },
    { narration: 'Jio Postpaid Bill', amount: 399, type: 'debit', category: 'Utilities', days: 67 },
    { narration: 'Airtel Broadband Bill', amount: 999, type: 'debit', category: 'Utilities', days: 67 },
    { narration: 'BWSSB Water Bill', amount: 340, type: 'debit', category: 'Utilities', days: 20 },

    // Healthcare
    { narration: 'Apollo Pharmacy', amount: 1245, type: 'debit', category: 'Healthcare', days: 9 },
    { narration: 'Manipal Hospital Consultation', amount: 800, type: 'debit', category: 'Healthcare', days: 24 },
    { narration: 'MedPlus Pharmacy', amount: 580, type: 'debit', category: 'Healthcare', days: 55 },
    { narration: 'Dental Clinic Dr Sharma', amount: 2500, type: 'debit', category: 'Healthcare', days: 70 },

    // Shopping
    { narration: 'Amazon.in Order #4021', amount: 2499, type: 'debit', category: 'Shopping', days: 6 },
    { narration: 'Flipkart Order #FL8812', amount: 3299, type: 'debit', category: 'Shopping', days: 19 },
    { narration: 'Myntra Order #MN3341', amount: 1799, type: 'debit', category: 'Shopping', days: 33 },
    { narration: 'Amazon.in Order #5512', amount: 899, type: 'debit', category: 'Shopping', days: 48 },
    { narration: 'Nykaa Order #NK2211', amount: 1250, type: 'debit', category: 'Shopping', days: 63 },
    { narration: 'Ajio Order #AJ7712', amount: 2100, type: 'debit', category: 'Shopping', days: 79 },

    // Credits (salary + misc)
    { narration: 'NEFT CR SALARY MAY 2026', amount: 85000, type: 'credit', category: 'Others', days: 1 },
    { narration: 'NEFT CR SALARY APR 2026', amount: 85000, type: 'credit', category: 'Others', days: 31 },
    { narration: 'NEFT CR SALARY MAR 2026', amount: 85000, type: 'credit', category: 'Others', days: 62 },
    { narration: 'UPI CR REFUND AMAZON', amount: 499, type: 'credit', category: 'Others', days: 10 },
    { narration: 'INTEREST CREDIT SB ACC', amount: 342, type: 'credit', category: 'Others', days: 30 },
  ]

  const txRows = transactions.map((tx, i) => ({
    user_id: user.id,
    transaction_id: `SEED_${i}_${user.id.slice(0, 8)}`,
    date: daysAgo(tx.days),
    description: tx.narration,
    amount: tx.amount,
    type: tx.type,
    category: tx.category,
    raw_data: { seeded: true },
  }))

  const { error: txError } = await supabase
    .from('transactions')
    .upsert(txRows, { onConflict: 'user_id,transaction_id' })

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

  // ── Watchlist ────────────────────────────────────────────
  const watchlistItems = [
    { ticker: 'INFY', company_name: 'Infosys Ltd' },
    { ticker: 'TCS', company_name: 'Tata Consultancy Services' },
    { ticker: 'RELIANCE', company_name: 'Reliance Industries' },
    { ticker: 'HDFCBANK', company_name: 'HDFC Bank' },
    { ticker: 'WIPRO', company_name: 'Wipro Ltd' },
  ]

  for (const item of watchlistItems) {
    await supabase.from('watchlist').upsert(
      { user_id: user.id, ...item },
      { onConflict: 'user_id,ticker' }
    )
  }

  // ── Paper holdings & trades ──────────────────────────────
  const paperTrades = [
    { ticker: 'INFY', action: 'buy', quantity: 10, price: 1720, days: 45 },
    { ticker: 'TCS', action: 'buy', quantity: 5, price: 3850, days: 30 },
    { ticker: 'HDFCBANK', action: 'buy', quantity: 15, price: 1620, days: 20 },
    { ticker: 'RELIANCE', action: 'buy', quantity: 8, price: 2910, days: 10 },
  ]

  for (const trade of paperTrades) {
    const totalValue = trade.price * trade.quantity

    // Upsert holding
    const { data: existing } = await supabase
      .from('paper_holdings')
      .select('*')
      .eq('user_id', user.id)
      .eq('ticker', trade.ticker)
      .single()

    if (existing) {
      const newQty = existing.quantity + trade.quantity
      const newAvg = (existing.quantity * existing.avg_buy_price + totalValue) / newQty
      await supabase.from('paper_holdings').update({ quantity: newQty, avg_buy_price: newAvg }).eq('id', existing.id)
    } else {
      await supabase.from('paper_holdings').insert({
        user_id: user.id,
        ticker: trade.ticker,
        company_name: watchlistItems.find((w) => w.ticker === trade.ticker)?.company_name ?? trade.ticker,
        quantity: trade.quantity,
        avg_buy_price: trade.price,
      })
    }

    // Log the trade
    await supabase.from('paper_trades').insert({
      user_id: user.id,
      ticker: trade.ticker,
      action: trade.action,
      quantity: trade.quantity,
      price: trade.price,
      total_value: totalValue,
      created_at: new Date(Date.now() - trade.days * 86400000).toISOString(),
    })
  }

  // Deduct paper balance for all buys
  const totalSpent = paperTrades.reduce((s, t) => s + t.price * t.quantity, 0)
  await supabase
    .from('user_profiles')
    .update({ paper_balance: 100000 - totalSpent })
    .eq('id', user.id)

  return NextResponse.json({
    ok: true,
    seeded: {
      transactions: txRows.length,
      watchlist: watchlistItems.length,
      paper_trades: paperTrades.length,
    },
  })
}
