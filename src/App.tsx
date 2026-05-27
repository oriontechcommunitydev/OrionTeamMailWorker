// Mailer Dashboard — Ana Sayfa
// Brevo + Supabase Email Worker Dashboard

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabaseClient'
import { DashboardStats } from './lib/types'
import StatsCards from './components/StatsCards'
import ComposeForm from './components/ComposeForm'
import MailHistoryTable from './components/MailHistoryTable'

import QueueTable from './components/QueueTable'
import TriggerButton from './components/TriggerButton'
import LastRunInfo from './components/LastRunInfo'
import SettingsPanel from './components/SettingsPanel'
import TemplatesPanel from './components/TemplatesPanel'
import LogsPanel from './components/LogsPanel'
import {
  Mail,
  RefreshCw,
  LayoutDashboard,
  Settings,
  FileText,
  Activity,
  Loader2,
} from 'lucide-react'

type ActiveTab = 'dashboard' | 'compose' | 'settings' | 'templates' | 'logs'

export default function App() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)

    try {
      // Bekleyen sayısı
      const { count: pending } = await supabase
        .from('email_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Toplam gönderilen
      const { count: sent } = await supabase
        .from('email_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')

      // Toplam başarısız
      const { count: failed } = await supabase
        .from('email_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')

      // Bugün gönderilen
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { count: sentToday } = await supabase
        .from('email_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('sent_at', todayStart.toISOString())

      // Son çalışma zamanı
      const { data: lastRunData } = await supabase
        .from('email_queue')
        .select('sent_at')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
        .single()

      // Günlük limit
      const { data: settingsData, error: settingsErr } = await supabase
        .from('email_settings')
        .select('setting_key, setting_value')

      let dailyLimit = 300
      if (!settingsErr && settingsData) {
        const map = settingsData.reduce<Record<string, string>>((acc, row) => {
          acc[row.setting_key] = row.setting_value ?? ''
          return acc
        }, {})
        dailyLimit = parseInt(map['daily_limit'] ?? '300', 10)
      }

      setStats({
        total_pending: pending ?? 0,
        total_sent: sent ?? 0,
        total_failed: failed ?? 0,
        sent_today: sentToday ?? 0,
        daily_limit: dailyLimit,
        last_run_at: (lastRunData as { sent_at: string } | null)?.sent_at ?? null,
      })
    } catch (err) {
      console.error('[Dashboard] Stats yüklenemedi:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStats()
    setRefreshTrigger((v) => v + 1)
    setTimeout(() => setRefreshing(false), 600)
  }

  const handleWorkerComplete = () => {
    void fetchStats()
    setRefreshTrigger((v) => v + 1)
  }

  const navItems: { key: ActiveTab; icon: React.ReactNode; label: string }[] = [
    { key: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Mail Kuyruğu' },
    { key: 'compose', icon: <Mail className="w-4 h-4" />, label: 'Mail Gönder' },
    { key: 'templates', icon: <FileText className="w-4 h-4" />, label: 'Şablonlar' },
    
    { key: 'logs', icon: <Activity className="w-4 h-4" />, label: 'Loglar' },
    { key: 'settings', icon: <Settings className="w-4 h-4" />, label: 'Ayarlar' },
  ]


  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Başlık */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-tight">Mailer Dashboard</h1>
                <p className="text-xs text-gray-500 leading-tight">Brevo + Supabase</p>
              </div>
            </div>

            {/* Sağ aksiyonlar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing || statsLoading}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                title="Yenile"
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
              <TriggerButton onComplete={handleWorkerComplete} />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-0.5 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === item.key
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Ana içerik */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            {/* İstatistik Kartları */}
            <StatsCards stats={stats} loading={statsLoading} />

            {/* Son çalışma bilgisi */}
            <LastRunInfo stats={stats} loading={statsLoading} />

            {/* Mail Kuyruğu Tablosu */}
            <QueueTable refreshTrigger={refreshTrigger} />
          </>
        )}

        {activeTab === 'compose' && (
          <>
            <ComposeForm />
            <div className="mt-6">
              <MailHistoryTable />
            </div>
          </>
        )}


        {activeTab === 'logs' && (
          <LogsPanel />
        )}

        {activeTab === 'templates' && (
          <TemplatesPanel />
        )}

        {activeTab === 'settings' && (
          <div className="max-w-5x1 mx-auto grig grig-cols-2 gap-6">
            <SettingsPanel />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-gray-800 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>Mailer Dashboard v1.0</span>
            <span>•</span>
            <span>Brevo + Supabase Email Worker</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>Cron: her 5 dakikada çalışır</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
