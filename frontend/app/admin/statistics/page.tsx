'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import AdminHeader from '@/components/admin/AdminHeader'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

type StatsState = {
  totalUsers: number
  totalTeams: number
  totalResults: number
  usersByRole: { participant: number; judge: number; admin: number }
  usersByStatus: { confirmed: number; pending: number; rejected: number }
  teamsByStatus: { confirmed: number; pending: number }
  teamsByCategory: Record<string, number>
  avgTeamScore: string
  topTeams: Array<{ id: string; name: string; category: string; avgScore?: number | string }>
  loading: boolean
}

function KpiCard({ title, value, icon }: { title: string; value: number | string; icon: string }) {
  return (
    <div className="admin-stats-panel">
      <div className="admin-stats-kpi__blob" aria-hidden />
      <div className="admin-stats-kpi">
        <div className="admin-stats-kpi__head">
          <div className="admin-stats-kpi__icon">
            <Image src={icon} alt="" width={22} height={22} className="admin-card-icon admin-card-icon--sm" />
          </div>
          <h3 className="admin-stats-kpi__title">{title}</h3>
        </div>
        <p className="admin-stats-kpi__value">{value}</p>
      </div>
    </div>
  )
}

function MiniTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-stats-tile">
      <p className="admin-stats-tile__value">{value}</p>
      <p className="admin-stats-tile__label">{label}</p>
    </div>
  )
}

function SectionPanel({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="admin-stats-panel">
      <div className="admin-card-blob" aria-hidden />
      <h3 className="admin-stats-panel__title">{title}</h3>
      {children}
    </div>
  )
}

export default function AdminStatisticsPage() {
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()
  const [stats, setStats] = useState<StatsState>({
    totalUsers: 0,
    totalTeams: 0,
    totalResults: 0,
    usersByRole: { participant: 0, judge: 0, admin: 0 },
    usersByStatus: { confirmed: 0, pending: 0, rejected: 0 },
    teamsByStatus: { confirmed: 0, pending: 0 },
    teamsByCategory: {},
    avgTeamScore: '0.00',
    topTeams: [],
    loading: true,
  })

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (user?.role !== 'admin') {
        router.push('/')
      } else {
        loadStatistics()
      }
    }
  }, [loading, isAuthenticated, user, router])

  const loadStatistics = async () => {
    try {
      const data = await api.getAdminStatistics()
      setStats({
        totalUsers: data.totalUsers,
        totalTeams: data.totalTeams,
        totalResults: data.totalResults,
        usersByRole: data.usersByRole,
        usersByStatus: data.usersByStatus,
        teamsByStatus: data.teamsByStatus,
        teamsByCategory: data.teamsByCategory,
        avgTeamScore: data.avgTeamScore,
        topTeams: data.topTeams,
        loading: false,
      })
    } catch (error) {
      console.error('Error loading statistics:', error)
      setStats((prev) => ({ ...prev, loading: false }))
    }
  }

  if (loading || stats.loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null
  }

  const categoryEntries = Object.entries(stats.teamsByCategory || {})

  return (
    <div className="min-h-screen bg-white">
      <AdminHeader />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-6 sm:py-8 md:py-10">
        <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 lg:p-10">
          <div className="mb-8 text-left">
            <h1 className="text-lg sm:text-xl md:text-[23px] font-semibold text-black mb-2">
              Детальная статистика
            </h1>
            <p className="text-sm text-[#71717B]">
              Подробная аналитика и распределение данных системы
            </p>
            {stats.totalUsers === 0 && stats.totalTeams === 0 && (
              <div className="mt-4 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#71717B]">
                База пуста — данные появятся после регистрации пользователей и создания команд.
              </div>
            )}
          </div>

          <div className="admin-stats-grid">
            <KpiCard title="Всего пользователей" value={stats.totalUsers} icon="/icons/user-icon.png" />
            <KpiCard title="Всего команд" value={stats.totalTeams} icon="/icons/group-icon.png" />
            <KpiCard
              title="Записей в листах"
              value={stats.totalResults}
              icon="/icons/task-list-icon.png"
            />

            <SectionPanel title="Пользователи по ролям">
              <div className="admin-stats-tiles admin-stats-tiles--3">
                <MiniTile label="Участники" value={stats.usersByRole.participant} />
                <MiniTile label="Судьи" value={stats.usersByRole.judge} />
                <MiniTile label="Админы" value={stats.usersByRole.admin} />
              </div>
            </SectionPanel>

            <SectionPanel title="Пользователи по статусам">
              <div className="admin-stats-tiles admin-stats-tiles--3">
                <MiniTile label="Подтверждены" value={stats.usersByStatus.confirmed} />
                <MiniTile label="На проверке" value={stats.usersByStatus.pending} />
                <MiniTile label="Отклонены" value={stats.usersByStatus.rejected} />
              </div>
            </SectionPanel>

            <SectionPanel title="Команды по статусам">
              <div className="admin-stats-tiles admin-stats-tiles--2">
                <MiniTile label="Подтверждены" value={stats.teamsByStatus.confirmed} />
                <MiniTile label="На проверке" value={stats.teamsByStatus.pending} />
              </div>
            </SectionPanel>

            <SectionPanel title="Средняя оценка">
              <div className="admin-stats-tiles admin-stats-tiles--2">
                <MiniTile
                  label="Балл"
                  value={stats.totalTeams > 0 ? stats.avgTeamScore : '—'}
                />
                <MiniTile label="Команд" value={stats.totalTeams} />
              </div>
            </SectionPanel>

            <SectionPanel title="Команды по категориям">
              {categoryEntries.length > 0 ? (
                <div
                  className={`admin-stats-tiles ${
                    categoryEntries.length >= 3
                      ? 'admin-stats-tiles--3'
                      : 'admin-stats-tiles--2'
                  }`}
                >
                  {categoryEntries.map(([category, count]) => (
                    <MiniTile key={category} label={category} value={count} />
                  ))}
                </div>
              ) : (
                <div className="admin-stats-tiles admin-stats-tiles--2">
                  <MiniTile label="Нет данных" value={0} />
                </div>
              )}
            </SectionPanel>

          {stats.topTeams.length > 0 && (
            <div className="admin-stats-panel admin-stats-grid__span-3">
              <div className="admin-card-blob" aria-hidden />
              <h3 className="admin-stats-panel__title">Топ-5 команд по оценкам</h3>
              <div className="admin-stats-rank-grid">
                {stats.topTeams.map((team, index) => (
                  <div key={team.id} className="admin-stats-rank-card">
                    <div
                      className={`admin-stats-rank-card__place${
                        index > 0 ? ' admin-stats-rank-card__place--alt' : ''
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="admin-stats-rank-card__info">
                      <p className="admin-stats-rank-card__name">{team.name}</p>
                      <p className="admin-stats-rank-card__meta">
                      {team.category}
                      {team.stage ? ` · ${team.stage === 'final' ? 'финал' : 'квалиф.'}` : ''}
                    </p>
                    </div>
                    <p className="admin-stats-rank-card__score">
                      {parseFloat(String(team.avgScore || 0)).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  )
}
