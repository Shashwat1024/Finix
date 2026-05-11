import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_complete, risk_profile, dhan_token_encrypted')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_complete) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <OnboardingWizard
        email={user.email ?? ''}
        initialRiskProfile={profile?.risk_profile ?? 'moderate'}
        hasDhanToken={!!profile?.dhan_token_encrypted}
      />
    </div>
  )
}
