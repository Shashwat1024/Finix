import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/dhan/client'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('risk_profile, dhan_token_encrypted')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    risk_profile: profile?.risk_profile ?? 'moderate',
    has_dhan_token: !!profile?.dhan_token_encrypted,
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dhan_token, risk_profile, onboarding_complete } = await request.json()

  const updates: Record<string, unknown> = {}
  if (risk_profile) updates.risk_profile = risk_profile
  if (dhan_token?.trim()) updates.dhan_token_encrypted = encryptToken(dhan_token.trim())
  if (onboarding_complete === 'true') updates.onboarding_complete = true

  if (Object.keys(updates).length === 0 && !onboarding_complete) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id: user.id, email: user.email, paper_balance: 100000, ...updates })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
