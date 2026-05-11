import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDhanClient } from '@/lib/dhan/client'
import { categorizeTransaction } from '@/lib/categorize'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('dhan_token_encrypted')
    .eq('id', user.id)
    .single()

  if (!profile?.dhan_token_encrypted) {
    return NextResponse.json({ error: 'No DHAN token configured. Go to Settings to add it.' }, { status: 400 })
  }

  const dhan = createDhanClient(profile.dhan_token_encrypted)

  if (!dhan.clientId) {
    return NextResponse.json({
      error: 'Could not read client ID from your DHAN token. Make sure you pasted the full JWT (starts with eyJ…) from DHAN → My Profile → Access Token.',
    }, { status: 400 })
  }

  const toDate = new Date().toISOString().split('T')[0]
  const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const warnings: string[] = []
  let syncedTransactions = 0
  let syncedHoldings = 0

  // ── Ledger ──────────────────────────────────────────────
  try {
    const ledger = await dhan.getLedger(fromDate, toDate)

    if (ledger.length > 0) {
      const rows = ledger.map((tx) => ({
        user_id: user.id,
        transaction_id: tx.transactionId,
        date: tx.transactionDate,
        description: tx.narration,
        amount: Math.abs(tx.amount),
        type: tx.transactionType === 'DEBIT' ? 'debit' : 'credit',
        category: categorizeTransaction(tx.narration),
        raw_data: tx,
      }))

      const { error } = await supabase
        .from('transactions')
        .upsert(rows, { onConflict: 'user_id,transaction_id' })

      if (error) throw new Error(error.message)
      syncedTransactions = rows.length
    }
  } catch (err) {
    warnings.push(`Transactions: ${err instanceof Error ? err.message : 'unknown error'}`)
  }

  // ── Holdings → Watchlist + Paper Holdings ───────────────
  try {
    const holdings = await dhan.getHoldings()
    // getHoldings() returns [] for DH-1111 (no holdings) — nothing to insert

    for (const h of holdings) {
      // Add to watchlist
      await supabase.from('watchlist').upsert(
        { user_id: user.id, ticker: h.tradingSymbol, company_name: h.tradingSymbol },
        { onConflict: 'user_id,ticker' }
      )

      // Sync into paper holdings (only if not already present — preserves paper trades)
      const avgPrice = h.avgCostPrice ?? 0
      const qty = h.totalQty ?? 0
      if (qty > 0 && avgPrice > 0) {
        await supabase.from('paper_holdings').upsert(
          {
            user_id: user.id,
            ticker: h.tradingSymbol,
            quantity: qty,
            avg_buy_price: avgPrice,
          },
          { onConflict: 'user_id,ticker', ignoreDuplicates: false }
        )
      }
    }

    syncedHoldings = holdings.length
  } catch (err) {
    warnings.push(`Holdings: ${err instanceof Error ? err.message : 'unknown error'}`)
  }

  // Both failed → return error
  if (warnings.length === 2) {
    return NextResponse.json({ error: warnings.join(' | ') }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    synced_transactions: syncedTransactions,
    synced_holdings: syncedHoldings,
    ...(warnings.length > 0 && { warnings }),
  })
}
