'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminHeader from '@/components/admin/AdminHeader'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { TeamStatusBadge } from '@/components/ui/StatusBadge'

export default function AdminTeamsPage() {
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()
  const [teams, setTeams] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
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
      } else if (user?.role !== 'admin') {
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
      setDataLoading(false)
    }
  }

  const loadParticipants = async () => {
    setLoadingParticipants(true)
    try {
      const allUsers = await api.getAllUsers()
      const teamsData = await api.getJudgeTeams()
      const userIdsInTeams = new Set<string>()
      for (const t of teamsData) {
        for (const m of t.members ?? []) {
          if (m.user?.id) userIdsInTeams.add(m.user.id)
        }
      }
      const participants = allUsers.filter(
        (u) =>
          u.role === 'participant' &&
          u.status === 'confirmed' &&
          !userIdsInTeams.has(u.id)
      )
      setAvailableParticipants(participants)
    } catch (error) {
      console.error('Error loading participants:', error)
      setAvailableParticipants([])
    } finally {
      setLoadingParticipants(false)
    }
  }

  const handleCreateTeam = async () => {
    try {
      const baseCategory = createFormData.category.trim()
      const categoryWithType = createFormData.championshipType === 'junior'
        ? (/юниор|junior/i.test(baseCategory) ? baseCategory : `${baseCategory} (junior)`)
        : baseCategory

      const teamData = {
        name: createFormData.name,
        category: categoryWithType,
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
  
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }
  
  if (!isAuthenticated || user?.role !== 'admin') {
    return null
  }
  
  return (
    <div className="min-h-screen bg-white">
      <AdminHeader />
      
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-6 sm:py-8 md:py-10">
        <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 lg:p-10">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-lg sm:text-xl md:text-[23px] font-semibold text-black mb-2">
                Все команды
              </h1>
              <p className="text-sm text-[#71717B]">
                Управление всеми командами в системе
              </p>
            </div>
            <Button
              onClick={() => {
                setShowCreateModal(true)
                loadParticipants()
              }}
              className="flex items-center gap-2"
            >
              <span>+ Создать команду</span>
            </Button>
          </div>

          <div className="space-y-4">
            {teams.length === 0 ? (
              <div className="text-center py-12">
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
              teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-white rounded-[26px] shadow-[0px_4px_17.8px_rgba(0,0,0,0.25)] p-6 sm:p-7 md:p-8"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-[16px] font-semibold text-black mb-1">
                        {team.name}
                      </h3>
                      <p className="text-[13px] font-medium text-[#71717B] mb-2">
                        {team.category}
                      </p>
                      <p className="text-xs font-medium text-[#334155] mb-2">
                        Тип: {/юниор|junior/i.test(team.category || '') ? 'Юниоры (2 блюда)' : 'Взрослые (3 блюда)'}
                      </p>
                      <div className="flex gap-4 text-sm">
                        <span className="text-[#71717B]">
                          Участников: {team.members?.length || 0}
                        </span>
                        {team.avgScore != null && team.avgScore !== '' && (
                          <span className="text-[#71717B]">
                            Средний балл ({team.stage === 'final' ? 'финал' : 'квалиф.'}): {team.avgScore}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <TeamStatusBadge status={team.status} />
                      <Link
                        href={`/admin/teams/${team.id}`}
                        className="flex items-center gap-2 bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white rounded-[6px] px-4 py-2.5 text-[13px] font-semibold transition-colors group"
                      >
                        <span>Открыть</span>
                        <svg
                          className="w-4 h-4 transition-transform group-hover:translate-x-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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
                <label className="block text-sm font-semibold text-black mb-2">Тип чемпионата</label>
                <select
                  value={createFormData.championshipType}
                  onChange={(e) => setCreateFormData({
                    ...createFormData,
                    championshipType: (e.target.value === 'junior' ? 'junior' : 'adult'),
                  })}
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 text-sm text-black bg-white"
                >
                  <option value="adult">Взрослые (3 блюда)</option>
                  <option value="junior">Юниоры (2 блюда)</option>
                </select>
              </div>

              <div className="border border-[#E2E8F0] rounded-md p-4">
                <label className="block text-sm font-semibold text-black mb-3">
                  Участники (выберите подтвержденных участников)
                </label>
                {loadingParticipants ? (
                  <p className="text-sm text-[#71717B]">Загрузка участников...</p>
                ) : availableParticipants.length === 0 ? (
                  <p className="text-sm text-[#71717B]">Нет подтвержденных участников</p>
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

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateFormData({ name: '', category: '', championshipType: 'adult', userIds: [] })
                }}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={!createFormData.name || !createFormData.category}
                className="flex-1"
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
