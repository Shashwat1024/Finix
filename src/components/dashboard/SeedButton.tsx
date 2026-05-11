'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical } from 'lucide-react'

export default function SeedButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSeed() {
    setLoading(true)
    const res = await fetch('/api/seed', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setDone(true)
      router.refresh()
    } else {
      alert(data.error ?? 'Seed failed')
    }
    setLoading(false)
  }

  if (done) return null

  return (
    <button
      onClick={handleSeed}
      disabled={loading}
      className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50 transition-colors"
    >
      <FlaskConical className="h-4 w-4" />
      {loading ? 'Seeding…' : 'Load demo data'}
    </button>
  )
}
