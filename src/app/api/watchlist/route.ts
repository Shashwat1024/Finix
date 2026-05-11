import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticker } = await request.json()
  if (!ticker) return NextResponse.json({ error: 'Ticker required' }, { status: 400 })

  const { data: item, error } = await supabase
    .from('watchlist')
    .upsert({ user_id: user.id, ticker: ticker.toUpperCase(), company_name: ticker.toUpperCase() }, { onConflict: 'user_id,ticker' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item })
}
