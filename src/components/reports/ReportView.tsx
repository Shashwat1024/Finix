'use client'

import { useState } from 'react'
import { MonthlyReport } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { FileText, RefreshCw, Download, Mail } from 'lucide-react'

interface Props {
  currentReport: MonthlyReport | null
  allReports: Pick<MonthlyReport, 'id' | 'report_month' | 'portfolio_health_score' | 'created_at'>[]
  userId: string
}

export default function ReportView({ currentReport: initialReport, allReports }: Props) {
  const [report, setReport] = useState(initialReport)
  const [generating, setGenerating] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')
  const [error, setError] = useState('')

  function downloadPDF() { window.print() }

  async function sendEmail() {
    setEmailing(true)
    setEmailMsg('')
    const res = await fetch('/api/reports/email', { method: 'POST' })
    const data = await res.json()
    if (res.ok) setEmailMsg(`Sent to ${data.email}`)
    else setEmailMsg(data.error ?? 'Failed to send')
    setEmailing(false)
  }

  async function generateReport() {
    setGenerating(true)
    setError('')
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Generation failed')
    } else {
      window.location.reload()
    }
    setGenerating(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      <div className="lg:col-span-2 space-y-4">
        {!report ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No report generated for this month yet.</p>
            <button
              onClick={generateReport}
              disabled={generating}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {generating ? 'Generating…' : 'Generate Report'}
            </button>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">
                  {new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(report.report_month + '-01'))}
                </h2>
                <div className="flex items-center gap-3 print:hidden">
                  <button onClick={downloadPDF}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" title="Download PDF">
                    <Download className="h-3 w-3" /> PDF
                  </button>
                  <button onClick={sendEmail} disabled={emailing}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50">
                    <Mail className="h-3 w-3" /> {emailing ? 'Sending…' : 'Email Report'}
                  </button>
                  <button onClick={generateReport} disabled={generating}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <RefreshCw className="h-3 w-3" /> Regenerate
                  </button>
                </div>
                {emailMsg && (
                  <p className={`text-xs mt-1 ${emailMsg.startsWith('Sent') ? 'text-green-400' : 'text-red-400'}`}>
                    {emailMsg}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-md bg-secondary p-3">
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="text-xl font-bold">{formatCurrency(report.spending_insights.total_spent)}</p>
                </div>
                <div className="rounded-md bg-secondary p-3">
                  <p className="text-xs text-muted-foreground">Portfolio Health</p>
                  <p className="text-xl font-bold">{report.portfolio_health_score}<span className="text-sm text-muted-foreground">/100</span></p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Spending by Category</h3>
                  <div className="space-y-1.5">
                    {Object.entries(report.spending_insights.by_category)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amount]) => (
                        <div key={cat} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{cat}</span>
                          <span>{formatCurrency(amount)}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Recommended Actions</h3>
                  <ul className="space-y-2">
                    {report.personalized_actions.map((action, i) => (
                      <li key={i} className="text-sm border-l-2 border-primary pl-3 leading-snug">
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5 h-fit">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Past Reports</h2>
        {allReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports yet.</p>
        ) : (
          <div className="space-y-2">
            {allReports.map((r) => (
              <div key={r.id} className="flex justify-between text-sm rounded-md bg-secondary px-3 py-2">
                <span>{r.report_month}</span>
                <span className="text-muted-foreground">Score: {r.portfolio_health_score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
