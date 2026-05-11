import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeToolCall } from '@/lib/openai/tools'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticker, action, quantity } = await request.json()

  if (!ticker || !action || !quantity || quantity <= 0) {
    return NextResponse.json({ error: 'Invalid trade parameters' }, { status: 400 })
  }

  try {
    const result = await executeToolCall('simulate_trade', { ticker, action, quantity }, user.id)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Trade failed' }, { status: 500 })
  }
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: trades } = await supabase
    .from('paper_trades')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ trades: trades ?? [] })
}
