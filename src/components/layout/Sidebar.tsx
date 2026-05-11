'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, MessageCircle, TrendingUp,
  FileText, Settings, LogOut, Menu, X, Bell, Newspaper, Sun, Moon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/paper-trading', label: 'Paper Trading', icon: TrendingUp },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex-1 p-3 space-y-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === href || pathname.startsWith(href + '/')
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return (
    <div className="flex items-center gap-3 w-full px-3 py-2">
      <div className="h-4 w-4 rounded bg-secondary/60" />
      <div className="h-3 w-16 rounded bg-secondary/60" />
    </div>
  )
  const isDark = theme === 'dark'
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      title="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
      {isDark ? 'Light mode' : 'Dark mode'}
    </button>
  )
}

export default function Sidebar() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const brand = (
    <div className="p-5 border-b border-border">
      <h1 className="text-xl font-bold text-primary">FinAgent</h1>
      <p className="text-xs text-muted-foreground mt-0.5">Personal Finance AI</p>
    </div>
  )

  const signOut = (
    <div className="p-3 border-t border-border space-y-1">
      <ThemeToggle />
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Sign out
      </button>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-card">
        {brand}
        <NavLinks />
        {signOut}
      </aside>

      {/* ── Mobile top bar ────────────────────────────── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 border-b border-border bg-card">
        <h1 className="text-lg font-bold text-primary">FinAgent</h1>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-md text-muted-foreground hover:bg-secondary"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ── Mobile drawer overlay ─────────────────────── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Drawer panel */}
          <aside
            className="relative flex flex-col w-64 h-full bg-card border-r border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h1 className="text-xl font-bold text-primary">FinAgent</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Personal Finance AI</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            {signOut}
          </aside>
        </div>
      )}
    </>
  )
}
