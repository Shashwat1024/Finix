import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Resend } from 'resend'
import { TransactionCategory } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY)

interface NewsletterContent {
  headline: string
  subheadline: string
  market_mood: number // 0-100 greed score
  market_mood_label: string
  spending_article: { title: string; body: string }
  portfolio_article: { title: string; body: string }
  insight_article: { title: string; body: string }
  top_actions: string[]
  quote: string
  quote_author: string
  winner_ticker: string
  winner_change: string
}

function buildEmailHTML(content: NewsletterContent, data: {
  email: string
  month: string
  totalSpent: number
  healthScore: number
  byCategory: Partial<Record<TransactionCategory, number>>
}): string {
  const moodColor = data.healthScore >= 70 ? '#22c55e' : data.healthScore >= 45 ? '#f59e0b' : '#ef4444'
  const moodBar = Math.round((data.healthScore / 100) * 200)
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const categoryRows = Object.entries(data.byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, amt]) => `
      <tr>
        <td style="padding:6px 0;color:#94a3b8;font-size:12px;">${cat}</td>
        <td style="padding:6px 0;color:#f1f5f9;font-size:12px;text-align:right;font-weight:600;">
          ₹${amt.toLocaleString('en-IN')}
        </td>
      </tr>`).join('')

  const actionItems = content.top_actions.map((a, i) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #1e293b;">
        <span style="color:#3b82f6;font-weight:700;margin-right:8px;">${i + 1}.</span>
        <span style="color:#e2e8f0;font-size:13px;">${a}</span>
      </td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FinAgent Daily — ${data.month}</title>
</head>
<body style="margin:0;padding:0;background:#020408;font-family:Georgia,serif;color:#e2e8f0;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#020408;padding:24px 0;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

  <!-- MASTHEAD -->
  <tr><td style="border-bottom:3px double #1e293b;padding-bottom:16px;text-align:center;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:4px;color:#475569;font-family:system-ui;">
      ARTIFICIAL INTELLIGENCE · PERSONAL FINANCE
    </p>
    <h1 style="margin:0;font-size:38px;letter-spacing:6px;color:#f8fafc;font-family:Georgia,serif;font-weight:400;">
      THE FINAGENT
    </h1>
    <p style="margin:4px 0 0;font-size:10px;letter-spacing:3px;color:#475569;font-family:system-ui;">DAILY</p>
    <div style="margin-top:10px;display:flex;justify-content:space-between;font-size:10px;color:#334155;font-family:system-ui;">
      <span>${date}</span>
      <span>SUBSCRIBER: ${data.email}</span>
      <span>EDITION: ${data.month.toUpperCase()}</span>
    </div>
  </td></tr>

  <!-- MAIN HEADLINE -->
  <tr><td style="padding:20px 0 12px;border-bottom:1px solid #1e293b;">
    <h2 style="margin:0 0 8px;font-size:26px;line-height:1.25;color:#f8fafc;font-family:Georgia,serif;">
      ${content.headline}
    </h2>
    <p style="margin:0;font-size:14px;color:#94a3b8;font-style:italic;">${content.subheadline}</p>
  </td></tr>

  <!-- META BAR -->
  <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:33%;text-align:center;">
          <p style="margin:0;font-size:9px;letter-spacing:2px;color:#475569;font-family:system-ui;">PORTFOLIO HEALTH</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:${moodColor};font-family:system-ui;">
            ${data.healthScore}<span style="font-size:12px;color:#475569;">/100</span>
          </p>
        </td>
        <td style="width:33%;text-align:center;border-left:1px solid #1e293b;border-right:1px solid #1e293b;">
          <p style="margin:0;font-size:9px;letter-spacing:2px;color:#475569;font-family:system-ui;">MARKET MOOD</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:${moodColor};font-family:system-ui;">
            ${content.market_mood_label}
          </p>
          <div style="margin:4px auto 0;width:80px;height:4px;background:#1e293b;border-radius:2px;">
            <div style="width:${moodBar / 2}px;height:4px;background:${moodColor};border-radius:2px;"></div>
          </div>
        </td>
        <td style="width:33%;text-align:center;">
          <p style="margin:0;font-size:9px;letter-spacing:2px;color:#475569;font-family:system-ui;">TOTAL SPENT</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#f8fafc;font-family:system-ui;">
            ₹${data.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- THREE COLUMN ARTICLES -->
  <tr><td style="padding:16px 0;border-bottom:1px solid #1e293b;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr valign="top">

        <!-- Col 1: Spending -->
        <td style="width:32%;padding-right:12px;border-right:1px solid #1e293b;">
          <p style="margin:0 0 6px;font-size:8px;letter-spacing:2px;color:#3b82f6;font-family:system-ui;font-weight:700;">
            SPENDING ANALYSIS
          </p>
          <h3 style="margin:0 0 8px;font-size:14px;line-height:1.3;color:#f1f5f9;font-family:Georgia,serif;">
            ${content.spending_article.title}
          </h3>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
            ${content.spending_article.body}
          </p>
        </td>

        <!-- Col 2: Portfolio -->
        <td style="width:34%;padding:0 12px;border-right:1px solid #1e293b;">
          <p style="margin:0 0 6px;font-size:8px;letter-spacing:2px;color:#22c55e;font-family:system-ui;font-weight:700;">
            PORTFOLIO REPORT
          </p>
          <h3 style="margin:0 0 8px;font-size:14px;line-height:1.3;color:#f1f5f9;font-family:Georgia,serif;">
            ${content.portfolio_article.title}
          </h3>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
            ${content.portfolio_article.body}
          </p>
          ${content.winner_ticker ? `
          <div style="margin-top:10px;background:#0f1f0f;border:1px solid #166534;border-radius:6px;padding:8px;">
            <p style="margin:0;font-size:9px;color:#4ade80;font-family:system-ui;letter-spacing:1px;">WEEK'S STAR</p>
            <p style="margin:2px 0 0;font-size:16px;font-weight:700;color:#86efac;font-family:system-ui;">
              ${content.winner_ticker} <span style="font-size:12px;">${content.winner_change}</span>
            </p>
          </div>` : ''}
        </td>

        <!-- Col 3: Insight -->
        <td style="width:32%;padding-left:12px;">
          <p style="margin:0 0 6px;font-size:8px;letter-spacing:2px;color:#f59e0b;font-family:system-ui;font-weight:700;">
            AI INSIGHT
          </p>
          <h3 style="margin:0 0 8px;font-size:14px;line-height:1.3;color:#f1f5f9;font-family:Georgia,serif;">
            ${content.insight_article.title}
          </h3>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
            ${content.insight_article.body}
          </p>
        </td>

      </tr>
    </table>
  </td></tr>

  <!-- SPENDING BREAKDOWN + ACTIONS side by side -->
  <tr><td style="padding:16px 0;border-bottom:1px solid #1e293b;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr valign="top">
        <td style="width:45%;padding-right:16px;">
          <p style="margin:0 0 10px;font-size:8px;letter-spacing:2px;color:#475569;font-family:system-ui;">
            SPENDING BREAKDOWN
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${categoryRows}
          </table>
        </td>
        <td style="width:55%;padding-left:16px;border-left:1px solid #1e293b;">
          <p style="margin:0 0 10px;font-size:8px;letter-spacing:2px;color:#475569;font-family:system-ui;">
            RECOMMENDED ACTIONS
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${actionItems}
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- QUOTE -->
  <tr><td style="padding:20px 0;border-bottom:1px solid #1e293b;text-align:center;">
    <p style="margin:0;font-size:16px;font-style:italic;color:#cbd5e1;line-height:1.5;font-family:Georgia,serif;">
      "${content.quote}"
    </p>
    <p style="margin:8px 0 0;font-size:11px;color:#475569;font-family:system-ui;">— ${content.quote_author}</p>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:16px 0;text-align:center;">
    <p style="margin:0;font-size:10px;color:#334155;font-family:system-ui;">
      Generated by FinAgent AI · ${date} · This is not financial advice.
    </p>
    <p style="margin:6px 0 0;font-size:10px;color:#1e293b;font-family:system-ui;">
      All data is personal and private. Powered by Gemini AI.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured in .env.local' }, { status: 500 })
  }

  const now = new Date()
  const reportMonth = now.toISOString().slice(0, 7)
  const [year, mon] = reportMonth.split('-').map(Number)
  const from = `${year}-${String(mon).padStart(2, '0')}-01`
  const to = new Date(year, mon, 0).toISOString().split('T')[0]

  const [{ data: txs }, { data: holdings }, { data: profile }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', from).lte('date', to).eq('type', 'debit'),
    supabase.from('paper_holdings').select('*').eq('user_id', user.id),
    supabase.from('user_profiles').select('paper_balance, risk_profile, email').eq('id', user.id).single(),
  ])

  const byCategory: Partial<Record<TransactionCategory, number>> = {}
  let totalSpent = 0
  for (const tx of txs ?? []) {
    totalSpent += tx.amount
    byCategory[tx.category as TransactionCategory] = (byCategory[tx.category as TransactionCategory] ?? 0) + tx.amount
  }

  const portfolioValue = (holdings ?? []).reduce((s, h) => s + h.quantity * h.avg_buy_price, 0)
  const healthScore = Math.min(100, Math.max(10, Math.round(50 + (portfolioValue / 10000) * 10 - (totalSpent / 50000) * 10)))
  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(now)

  const prompt = `You are writing a premium financial newsletter for an Indian investor. Generate compelling newspaper-style content.

Data:
- Month: ${monthLabel}
- Risk Profile: ${profile?.risk_profile ?? 'moderate'}
- Total Spent: ₹${totalSpent.toFixed(0)}
- Spending by Category: ${JSON.stringify(byCategory)}
- Paper Holdings: ${holdings?.length ?? 0} stocks, value ~₹${portfolioValue.toFixed(0)}
- Portfolio Health Score: ${healthScore}/100

Return ONLY valid JSON with this exact structure:
{
  "headline": "A compelling 8-12 word newspaper headline about this month's financial story",
  "subheadline": "A 15-20 word deck that adds context to the headline",
  "market_mood": 65,
  "market_mood_label": "Cautiously Optimistic",
  "spending_article": {
    "title": "5-8 word article headline about spending",
    "body": "2-3 sentence analysis of spending patterns, written in newspaper style"
  },
  "portfolio_article": {
    "title": "5-8 word article headline about portfolio",
    "body": "2-3 sentence analysis of portfolio health, written in newspaper style"
  },
  "insight_article": {
    "title": "5-8 word headline with the key AI insight",
    "body": "2-3 sentence forward-looking insight or recommendation"
  },
  "top_actions": ["Specific action 1", "Specific action 2", "Specific action 3"],
  "quote": "A relevant financial wisdom quote (real or paraphrased)",
  "quote_author": "Author name",
  "winner_ticker": "INFY",
  "winner_change": "+4.2%"
}`

  let content: NewsletterContent
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const result = await model.generateContent(prompt)
    content = JSON.parse(result.response.text())
  } catch (err) {
    return NextResponse.json({ error: `AI generation failed: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }

  const html = buildEmailHTML(content, {
    email: user.email ?? '',
    month: monthLabel,
    totalSpent,
    healthScore,
    byCategory,
  })

  const fromAddress = process.env.RESEND_FROM ?? 'FinAgent <onboarding@resend.dev>'

  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: user.email!,
      subject: `The FinAgent Daily — ${monthLabel}`,
      html,
    })
    if (error) throw new Error(error.message)
  } catch (err) {
    return NextResponse.json({ error: `Email failed: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email: user.email })
}
