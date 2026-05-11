import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/dhan/client'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { risk_profile, dhan_token } = await request.json()

  const encrypted = dhan_token ? encryptToken(dhan_token) : null

  const { error } = await supabase.from('user_profiles').upsert({
    id: user.id,
    email: user.email,
    risk_profile: risk_profile ?? 'moderate',
    dhan_token_encrypted: encrypted,
    paper_balance: 100000,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
