import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      {/* pt-14 offsets the fixed mobile top bar; md:pt-0 removes it on desktop */}
      <main className="flex-1 overflow-y-auto p-4 pt-[calc(3.5rem+1rem)] md:pt-6 md:p-6">
        {children}
      </main>
    </div>
  )
}
