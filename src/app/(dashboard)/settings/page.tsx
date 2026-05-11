import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/settings/SettingsForm'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('risk_profile, dhan_token_encrypted')
    .eq('id', user!.id)
    .single()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and DHAN connection</p>
      </div>
      <SettingsForm
        initialRiskProfile={profile?.risk_profile ?? 'moderate'}
        hasDhanToken={!!profile?.dhan_token_encrypted}
        email={user!.email ?? ''}
      />
    </div>
  )
}
