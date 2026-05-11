import { createClient } from '@/lib/supabase/server'
import AlertsPanel from '@/components/alerts/AlertsPanel'

export default async function AlertsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-muted-foreground text-sm mt-1">Get notified when prices or spending hit your targets</p>
      </div>
      <AlertsPanel initialAlerts={alerts ?? []} />
    </div>
  )
}
