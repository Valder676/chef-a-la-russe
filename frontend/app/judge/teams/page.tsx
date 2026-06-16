'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import JudgeHeader from '@/components/judge/JudgeHeader'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Team {
  id: string
  name: string
  category: string
  championshipType?: string
  avgScore?: string
  members?: Array<{ user: { fio: string } }>
}

export default function JudgeTeamsPage() {
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    name: '',
    category: '',
    championshipType: 'adult' as 'adult' | 'junior',
    userIds: [] as string[],
  })
  const [availableParticipants, setAvailableParticipants] = useState<any[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (user?.role !== 'judge') {
        router.push('/')
      } else {
        loadTeams()
      }
    }
  }, [loading, isAuthenticated, user, router])

  const loadTeams = async () => {
    try {
      const teamsData = await api.getJudgeTeams()
      setTeams(teamsData)
    } catch (error) {
      console.error('Error loading teams:', error)
      setTeams([])
    } finally {
      setTeamsLoading(false)
    }
  }

  const loadParticipants = async () => {
    setLoadingParticipants(true)
    try {
      const participants = await api.getJudgeParticipants()
      setAvailableParticipants(
        participants.filter(
          (p: { status: string; teamMembers?: unknown[] }) =>
            p.status === 'confirmed' && (p.teamMembers?.length ?? 0) === 0
        )
      )
    } catch (error) {
      console.error('Error loading participants:', error)
      setAvailableParticipants([])
    } finally {
      setLoadingParticipants(false)
    }
  }

  const handleCreateTeam = async () => {
    try {
      const teamData = {
        name: createFormData.name.trim(),
        category: createFormData.category.trim(),
        championshipType: createFormData.championshipType,
        userIds: createFormData.userIds.length > 0 ? createFormData.userIds : undefined,
      }
      await api.createTeam(teamData)
      setShowCreateModal(false)
      setCreateFormData({ name: '', category: '', championshipType: 'adult', userIds: [] })
      loadTeams()
    } catch (error: any) {
      alert(error.message || 'Ошибка создания команды')
    }
  }

  return (
    <div className="min-h-screen">
      <JudgeHeader />
      
      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-4 sm:py-8 md:py-10 pb-safe">
        <div className="bg-white rounded-[20px] sm:rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-4 sm:p-7 md:p-8 lg:p-10 mx-auto max-w-[1220px]">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between pb-4 border-b border-[#E9EEF4]">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-black tracking-tight">
                Команды
              </h1>
              <p className="mt-1 text-sm text-[#64748B]">
                Управление командами чемпионата
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true)
                loadParticipants()
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b] transition-colors touch-manipulation w-full sm:w-auto"
            >
              <span className="text-lg leading-none">+</span>
              Создать команду
            </button>
          </div>

          {teams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#71717B] mb-4">Команды не найдены</p>
              <Button
                onClick={() => {
                  setShowCreateModal(true)
                  loadParticipants()
                }}
                variant="secondary"
              >
                Создать первую команду
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-3 sm:gap-4 list-none m-0 p-0">
              {teams.map((team) => (
                <li
                  key={team.id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#E2E8F0] bg-[#FAFBFC] px-4 py-4 sm:px-6 sm:py-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:border-[#CBD5E1] hover:bg-white hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)]"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/judge/teams/${team.id}`}
                      className="text-base font-semibold text-black hover:text-[#0F172A] break-words"
                    >
                      {team.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      {team.championshipType === 'junior' || /юниор|junior/i.test(team.category || '')
                        ? 'Юниоры · 2 блюда'
                        : 'Взрослые · 3 блюда'}
                      {team.category ? ` · ${team.category}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-[#94A3B8] line-clamp-2">
                      {team.members && team.members.length > 0
                        ? team.members.map((m) => m.user.fio).join(', ')
                        : 'Нет участников'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {team.avgScore != null && team.avgScore !== '' && (
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wide text-[#94A3B8]">
                          Ср. балл · {team.stage === 'final' ? 'финал' : 'квалиф.'}
                        </p>
                        <p className="text-sm font-semibold text-black tabular-nums">{team.avgScore}</p>
                      </div>
                    )}
                    <Link
                      href={`/judge/teams/${team.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9] transition-colors touch-manipulation"
                    >
                      Открыть
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] shadow-lg p-6 sm:p-8 max-w-[600px] w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-black mb-6">
              Создать новую команду
            </h3>
            
            <div className="space-y-4">
              <Input
                label="Название команды"
                type="text"
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                placeholder="Команда №1"
                required
              />
              
              <Input
                label="Категория"
                type="text"
                value={createFormData.category}
                onChange={(e) => setCreateFormData({ ...createFormData, category: e.target.value })}
                placeholder="Hot Kitchen"
                required
              />

              <div>
                <label className="block text-sm font-semibold text-black mb-2">Тип команды</label>
                <select
                  value={createFormData.championshipType}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      championshipType: e.target.value === 'junior' ? 'junior' : 'adult',
                    })
                  }
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm bg-white text-black"
                >
                  <option value="adult">Взрослая (3 блюда)</option>
                  <option value="junior">Юниорская (2 блюда)</option>
                </select>
                <p className="text-xs text-[#71717B] mt-1.5">
                  Для юниоров на квалификации и в финале учитываются только два блюда.
                </p>
              </div>
              
              <div className="border border-[#E2E8F0] rounded-md p-4">
                <label className="block text-sm font-semibold text-black mb-3">
                  Участники (выберите подтвержденных участников)
                </label>
                {loadingParticipants ? (
                  <p className="text-sm text-[#71717B]">Загрузка участников...</p>
                ) : availableParticipants.length === 0 ? (
                  <p className="text-sm text-[#71717B]">
                    Нет свободных подтверждённых участников (без команды)
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableParticipants.map((participant) => (
                      <label
                        key={participant.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={createFormData.userIds.includes(participant.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateFormData({
                                ...createFormData,
                                userIds: [...createFormData.userIds, participant.id],
                              })
                            } else {
                              setCreateFormData({
                                ...createFormData,
                                userIds: createFormData.userIds.filter(id => id !== participant.id),
                              })
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div>
                          <span className="text-sm font-medium text-black">{participant.fio}</span>
                          {participant.email && (
                            <span className="text-xs text-[#71717B] ml-2">{participant.email}</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateFormData({ name: '', category: '', championshipType: 'adult', userIds: [] })
                }}
                className="w-full sm:flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={!createFormData.name || !createFormData.category}
                className="w-full sm:flex-1"
              >
                Создать команду
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
