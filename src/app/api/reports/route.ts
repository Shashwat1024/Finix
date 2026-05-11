import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SpendingInsights, TransactionCategory } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { month } = await request.json() // format: "2026-05"
  const reportMonth = month ?? new Date().toISOString().slice(0, 7)
  const [year, mon] = reportMonth.split('-').map(Number)
  const from = `${year}-${String(mon).padStart(2, '0')}-01`
  const to = new Date(year, mon, 0).toISOString().split('T')[0]

  const [{ data: txs }, { data: holdings }, { data: profile }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', from).lte('date', to).eq('type', 'debit'),
    supabase.from('paper_holdings').select('*').eq('user_id', user.id),
    supabase.from('user_profiles').select('paper_balance, risk_profile').eq('id', user.id).single(),
  ])

  const byCategory: Partial<Record<TransactionCategory, number>> = {}
  let totalSpent = 0
  for (const tx of txs ?? []) {
    totalSpent += tx.amount
    byCategory[tx.category as TransactionCategory] = (byCategory[tx.category as TransactionCategory] ?? 0) + tx.amount
  }

  const topCategory = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0]?.[0] as TransactionCategory | undefined
  const portfolioValue = (holdings ?? []).reduce((s, h) => s + h.quantity * h.avg_buy_price, 0)
  const healthScore = Math.min(100, Math.round(50 + (portfolioValue / 10000) * 10 - (totalSpent / 50000) * 10))

  const spendingInsights: SpendingInsights = {
    total_spent: totalSpent,
    by_category: byCategory as Record<TransactionCategory, number>,
    top_category: topCategory ?? 'Others',
    vs_last_month_pct: null,
    notable_transactions: [],
  }

  const prompt = `Generate a concise monthly financial report for an Indian investor.

Month: ${reportMonth}
Risk Profile: ${profile?.risk_profile ?? 'moderate'}
Total Spent: ₹${totalSpent.toFixed(0)}
Spending by Category: ${JSON.stringify(byCategory)}
Portfolio Holdings: ${holdings?.length ?? 0} stocks, value ~₹${portfolioValue.toFixed(0)}
Paper Balance: ₹${profile?.paper_balance?.toFixed(0) ?? '100000'}
Health Score: ${healthScore}/100

Return a JSON object with exactly these fields:
{
  "spending_insights_text": "2-3 sentences about spending patterns",
  "portfolio_health_text": "1-2 sentences about portfolio health",
  "personalized_actions": ["action 1", "action 2", "action 3"]
}
Only return valid JSON, no markdown.`

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const completion = await model.generateContent(prompt)
    const aiOutput = JSON.parse(completion.response.text())

    const { error } = await supabase.from('monthly_reports').upsert({
      user_id: user.id,
      report_month: reportMonth,
      spending_insights: { ...spendingInsights, summary: aiOutput.spending_insights_text },
      portfolio_health_score: healthScore,
      personalized_actions: aiOutput.personalized_actions ?? [],
      raw_data: { aiOutput, portfolioValue, totalSpent },
    }, { onConflict: 'user_id,report_month' })

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, health_score: healthScore, actions: aiOutput.personalized_actions })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Report generation failed' }, { status: 500 })
  }
}
