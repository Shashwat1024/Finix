import { createClient } from '@/lib/supabase/server'
import ReportView from '@/components/reports/ReportView'

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: report } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('user_id', user!.id)
    .eq('report_month', currentMonth)
    .single()

  const { data: allReports } = await supabase
    .from('monthly_reports')
    .select('id, report_month, portfolio_health_score, created_at')
    .eq('user_id', user!.id)
    .order('report_month', { ascending: false })
    .limit(6)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monthly Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">AI-generated financial summaries</p>
      </div>
      <ReportView currentReport={report} allReports={allReports ?? []} userId={user!.id} />
    </div>
  )
}
