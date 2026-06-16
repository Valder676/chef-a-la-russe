'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import JudgeHeader from '@/components/judge/JudgeHeader'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { User, Result, UploadWithUser, getToken } from '@/lib/api'
import { activeStageDishCount } from '@backend/lib/dish-count'
import { AccountStatusBadge, SheetStatusBadge } from '@/components/ui/StatusBadge'

interface TeamData {
  id: string
  name: string
  category: string
  championshipType?: 'adult' | 'junior'
  status: string
  stage?: 'qualifier' | 'final'
  resultsPublished?: boolean
  members: Array<{
    id: string
    user: User
    status: string
  }>
  results: Result[]
}

interface JudgeSummary {
  judgeId: string
  judgeName?: string
  judgeEmail?: string
  total: number
  average: number
  results: Result[]
}

interface TeamMemberFiles {
  documents: Array<{ id: string; name: string; fileName: string }>
  uploads: UploadWithUser[]
}

function getJudgeLoginLabel(judgeName?: string, judgeEmail?: string) {
  if (judgeName?.trim()) return judgeName.trim()
  const loginFromEmail = judgeEmail?.split('@')[0]?.trim()
  if (loginFromEmail) return loginFromEmail
  return 'Судья'
}

function judgeSummarySortKey(s: JudgeSummary): string {
  const fio = s.judgeName?.trim()
  if (fio) return fio.toLocaleLowerCase()
  return (s.judgeEmail?.split('@')[0]?.trim() || '').toLocaleLowerCase()
}

function sortJudgeSummariesForViewer(
  summaries: JudgeSummary[],
  currentUserId?: string | null
): JudgeSummary[] {
  return [...summaries].sort((a, b) => {
    if (currentUserId) {
      const aMine = a.judgeId === currentUserId
      const bMine = b.judgeId === currentUserId
      if (aMine !== bMine) return aMine ? -1 : 1
    }
    return judgeSummarySortKey(a).localeCompare(judgeSummarySortKey(b), 'ru', { sensitivity: 'base' })
  })
}

export default function TeamDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string
  const { isAuthenticated, loading, user } = useAuth()
  const [team, setTeam] = useState<TeamData | null>(null)
  const [judges, setJudges] = useState<User[]>([])
  const [participants, setParticipants] = useState<User[]>([])
  const [judgeSummaries, setJudgeSummaries] = useState<JudgeSummary[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [memberActionLoading, setMemberActionLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [publishLoading, setPublishLoading] = useState(false)
  const [stageLoading, setStageLoading] = useState(false)
  const [memberFiles, setMemberFiles] = useState<Record<string, TeamMemberFiles>>({})
  const [filesLoading, setFilesLoading] = useState(false)
  const [showEditTeam, setShowEditTeam] = useState(false)
  const [editTeamForm, setEditTeamForm] = useState({ name: '', category: '' })
  const [teamActionLoading, setTeamActionLoading] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (user?.role !== 'judge') {
        router.push('/')
      } else if (teamId) {
        loadTeamData()
      }
    }
  }, [loading, isAuthenticated, user, router, teamId])

  const loadTeamData = async () => {
    try {
      setDataLoading(true)
      const [teamData, judgesData, participantsData] = await Promise.all([
        api.getJudgeTeam(teamId),
        api.getJudges(),
        api.getJudgeParticipants(),
      ])

      setTeam(teamData)
      setJudges(judgesData)
      setParticipants(participantsData)

      const teamMemberIds: string[] = (teamData.members || []).map((m: any) => m.user.id)
      if (teamMemberIds.length > 0) {
        setFilesLoading(true)
        const files = await Promise.all(
          teamMemberIds.map(async (memberId) => {
            const [documents, uploads] = await Promise.all([
              api.getParticipantDocuments(memberId).catch(() => []),
              api.getJudgeUploads(memberId).catch(() => []),
            ])
            return [memberId, { documents, uploads }] as const
          })
        )
        setMemberFiles(Object.fromEntries(files))
        setFilesLoading(false)
      } else {
        setMemberFiles({})
      }
      
      if (teamData && teamData.results) {
        const teamStage: 'qualifier' | 'final' = teamData?.stage === 'final' ? 'final' : 'qualifier'
        const summaries: JudgeSummary[] = judgesData.map(judge => {
          const judgeResults = (teamData.results || []).filter((r: Result) => r.judgeId === judge.id && (r.stage || 'qualifier') === teamStage)
          const total = judgeResults.reduce((sum: number, r: Result) => sum + (r.total || 0), 0)
          const average = judgeResults.length > 0 ? total / judgeResults.length : 0
          
          return {
            judgeId: judge.id,
            judgeName: judge.fio,
            judgeEmail: judge.email,
            total,
            average,
            results: judgeResults,
          }
        })

        setJudgeSummaries(sortJudgeSummariesForViewer(summaries, user?.id))
      } else {
        setJudgeSummaries([])
      }
    } catch (error: any) {
      console.error('Error loading team data:', error)
      alert(error.message || 'Ошибка загрузки данных команды')
      setTeam(null)
      setJudges([])
      setJudgeSummaries([])
    } finally {
      setDataLoading(false)
      setFilesLoading(false)
    }
  }

  const downloadByUrl = async (url: string, fileName: string) => {
    const token = getToken()
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return
    const blob = await response.blob()
    const href = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(href)
  }

  const handleDownloadMemberDocs = async (memberId: string, memberName: string) => {
    const docs = memberFiles[memberId]?.documents || []
    if (docs.length === 0) return
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      await downloadByUrl(`/api/documents/${doc.id}/download`, `${memberName}_${doc.name}`)
      if (i < docs.length - 1) await new Promise((r) => setTimeout(r, 250))
    }
  }

  const handleDownloadMemberUploads = async (memberId: string, memberName: string) => {
    const uploads = memberFiles[memberId]?.uploads || []
    if (uploads.length === 0) return
    for (let i = 0; i < uploads.length; i++) {
      const u = uploads[i]
      const kind = u.fileType === 'techCard' ? 'ТК' : u.fileType === 'photo' ? 'Фото' : 'Меню'
      const suffix = u.fileType === 'menu' ? '' : `_блюдо${u.dishNumber}`
      await downloadByUrl(`/api/uploads/${u.id}/download`, `${memberName}_${kind}${suffix}_${u.fileName}`)
      if (i < uploads.length - 1) await new Promise((r) => setTimeout(r, 250))
    }
  }

  const handleAddMember = async () => {
    if (!selectedUserId || !teamId) return
    try {
      setMemberActionLoading(true)
      await api.addTeamMember(teamId, selectedUserId)
      setSelectedUserId('')
      await loadTeamData()
    } catch (error: any) {
      alert(error.message || 'Ошибка добавления участника в команду')
    } finally {
      setMemberActionLoading(false)
    }
  }

  const handlePublishResults = async (published: boolean) => {
    if (!teamId) return
    try {
      setPublishLoading(true)
      await api.publishTeamResults(teamId, published)
      await loadTeamData()
    } catch (error: any) {
      alert(error.message || 'Ошибка публикации результатов')
    } finally {
      setPublishLoading(false)
    }
  }

  const handleToggleStage = async () => {
    if (!teamId || !team) return
    const nextStage: 'qualifier' | 'final' = team.stage === 'final' ? 'qualifier' : 'final'
    try {
      setStageLoading(true)
      await api.updateTeamStage(teamId, nextStage)
      await loadTeamData()
    } catch (error: any) {
      alert(error.message || 'Ошибка смены этапа')
    } finally {
      setStageLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string, fio: string) => {
    if (!teamId) return
    if (!confirm(`Удалить участника "${fio}" из команды?`)) return

    try {
      setMemberActionLoading(true)
      await api.removeTeamMember(teamId, memberId)
      await loadTeamData()
    } catch (error: any) {
      alert(error.message || 'Ошибка удаления участника из команды')
    } finally {
      setMemberActionLoading(false)
    }
  }

  const handleOpenEditTeam = () => {
    if (!team) return
    setEditTeamForm({
      name: team.name,
      category: team.category,
    })
    setShowEditTeam(true)
  }

  const handleSaveTeamEdit = async () => {
    if (!teamId) return
    try {
      setTeamActionLoading(true)
      await api.updateJudgeTeam(teamId, {
        name: editTeamForm.name.trim(),
        category: editTeamForm.category.trim(),
      })
      setShowEditTeam(false)
      await loadTeamData()
    } catch (error: any) {
      alert(error.message || 'Ошибка сохранения команды')
    } finally {
      setTeamActionLoading(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!teamId) return
    if (
      !confirm(
        'Удалить команду полностью? Будут удалены связи участников и все оценки по этой команде.'
      )
    )
      return
    try {
      setTeamActionLoading(true)
      await api.deleteJudgeTeam(teamId)
      router.push('/judge/teams')
    } catch (error: any) {
      alert(error.message || 'Ошибка удаления команды')
    } finally {
      setTeamActionLoading(false)
    }
  }

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }
  
  if (!isAuthenticated || user?.role !== 'judge') {
    return null
  }

  if (!team) {
    return (
      <div className="min-h-screen">
        <JudgeHeader />
        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-6 sm:py-8 md:py-10">
          <div className="text-center py-12">
            <p className="text-[#71717B]">Команда не найдена</p>
          </div>
        </main>
      </div>
    )
  }

  const memberUserIds = new Set(team.members.map((m) => m.user.id))
  const availableParticipants = participants.filter((p: any) => {
    if (memberUserIds.has(p.id)) return false
    const inOtherTeam = (p.teamMembers ?? []).some(
      (tm: { teamId: string }) => tm.teamId && tm.teamId !== teamId
    )
    return !inOtherTeam
  })

  const dishCountForTeam = activeStageDishCount(team)

  return (
    <div className="min-h-screen">
      <JudgeHeader />
      
      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-4 sm:py-8 md:py-10 pb-safe">
        <div className="bg-white rounded-[20px] sm:rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-4 sm:p-7 md:p-8 lg:p-10 mx-auto max-w-[1220px]">
          <div className="mb-5 sm:mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-5 sm:pb-6 border-b border-[#E9EEF4]">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-[23px] font-semibold text-black mb-2 break-words">
                {team.name}
              </h1>
              <p className="text-[#71717B] text-xs sm:text-sm">{team.category}</p>
              {team.championshipType === 'junior' && (
                <p className="mt-1 text-xs text-[#71717B]">Юниорская категория</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleOpenEditTeam}
                className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-2.5 sm:px-4 sm:py-2 rounded-[8px] text-xs sm:text-sm font-semibold transition-colors text-center min-h-[44px] sm:min-h-0 touch-manipulation"
              >
                Редактировать
              </button>
              <button
                type="button"
                onClick={handleDeleteTeam}
                disabled={teamActionLoading}
                className="bg-red-50 hover:bg-red-600 hover:text-white text-red-800 px-3 py-2.5 sm:px-4 sm:py-2 rounded-[8px] text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 text-center min-h-[44px] sm:min-h-0 touch-manipulation"
              >
                Удалить
              </button>
              <button
                type="button"
                onClick={handleToggleStage}
                disabled={stageLoading}
                className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white disabled:opacity-50 text-black px-3 py-2.5 sm:px-4 sm:py-2 rounded-[8px] text-xs sm:text-sm font-semibold transition-colors col-span-2 sm:col-auto text-center min-h-[44px] sm:min-h-0 touch-manipulation"
              >
                {stageLoading
                  ? '...'
                  : `Этап: ${team.stage === 'final' ? 'Финал' : 'Квалификация'}`}
              </button>
              <button
                type="button"
                onClick={() => handlePublishResults(!(team.resultsPublished ?? false))}
                disabled={publishLoading}
                className={`col-span-2 sm:col-auto px-3 py-2.5 sm:px-4 sm:py-2 rounded-[8px] text-xs sm:text-sm font-semibold transition-colors text-center min-h-[44px] sm:min-h-0 touch-manipulation disabled:opacity-50 ${
                  team.resultsPublished ?? false
                    ? 'bg-[#F1F5F9] text-black hover:bg-[#E2E8F0]'
                    : 'bg-[#0F172A] text-white hover:bg-[#1e293b]'
                }`}
              >
                {publishLoading
                  ? '...'
                  : team.resultsPublished ?? false
                    ? 'Скрыть результаты'
                    : 'Опубликовать'}
              </button>
              <Link
                href="/judge/teams"
                className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-2.5 sm:px-4 sm:py-2 rounded-[8px] text-xs sm:text-sm font-semibold transition-colors text-center min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation col-span-2 sm:col-auto"
              >
                Назад к списку
              </Link>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-black mb-4">
              Участники команды
            </h2>

            {team.members.length === 0 ? (
              <p className="text-sm text-[#71717B] mb-4">
                В команде пока нет участников.
              </p>
            ) : (
              <div className="judge-table-wrap mb-4">
                <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
                <table className="w-full min-w-[520px] sm:min-w-0 border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="py-2 px-3 text-left text-sm font-semibold text-black">ФИО</th>
                      <th className="py-2 px-3 text-left text-sm font-semibold text-black">Email</th>
                      <th className="py-2 px-3 text-left text-sm font-semibold text-black">Статус аккаунта</th>
                      <th className="py-2 px-3 text-left text-sm font-semibold text-black">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.members.map((member) => {
                      const accountConfirmed = member.user?.status === 'confirmed'
                      return (
                      <tr key={member.id} className="border-b border-[#E2E8F0]">
                        <td className="py-2 px-3 text-sm">{member.user.fio}</td>
                        <td className="py-2 px-3 text-sm">{member.user.email}</td>
                        <td className="py-2 px-3 text-sm">
                          <AccountStatusBadge
                            status={accountConfirmed ? 'confirmed' : 'pending'}
                            tone="admin"
                          />
                        </td>
                        <td className="py-2 px-3 text-sm">
                          <button
                            onClick={() => handleRemoveMember(member.id, member.user.fio)}
                            className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                            disabled={memberActionLoading}
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    )
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 sm:p-5 bg-[#F9FAFB] border border-[#E2E8F0] rounded-[16px]">
              <label className="block text-sm font-semibold text-black mb-3">
                Добавить участника в команду
              </label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 min-w-0 w-full h-11 px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-[10px] text-sm text-black placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all cursor-pointer"
                >
                  <option value="">Выберите участника</option>
                  {availableParticipants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fio} ({p.email})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUserId || memberActionLoading}
                  className="shrink-0 w-full sm:w-auto h-11 px-6 bg-[#0F172A] text-white rounded-[10px] text-sm font-semibold hover:bg-[#1e293b] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {memberActionLoading ? 'Сохранение...' : 'Добавить в команду'}
                </button>
              </div>
              {availableParticipants.length === 0 && (
                <p className="mt-2 text-xs text-[#71717B]">
                  Нет свободных участников: все уже в этой или другой команде.
                </p>
              )}
            </div>
          </div>

          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-black">Файлы команды и личные документы</h2>
            </div>
            {filesLoading ? (
              <p className="text-sm text-[#71717B]">Загрузка файлов участников...</p>
            ) : team.members.length === 0 ? (
              <p className="text-sm text-[#71717B]">Добавьте участников в команду, чтобы видеть документы.</p>
            ) : (
              <div className="judge-table-wrap">
                <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
                <table className="w-full min-w-[560px] sm:min-w-0 border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="py-2 px-3 text-left text-sm font-semibold text-black">Участник</th>
                      <th className="py-2 px-3 text-left text-sm font-semibold text-black">Личные документы</th>
                      <th className="py-2 px-3 text-left text-sm font-semibold text-black">Загрузки блюд</th>
                      <th className="py-2 px-3 text-left text-sm font-semibold text-black">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.members.map((member) => {
                      const docs = memberFiles[member.user.id]?.documents || []
                      const uploads = memberFiles[member.user.id]?.uploads || []
                      return (
                        <tr key={member.id} className="border-b border-[#E2E8F0]">
                          <td className="py-2 px-3 text-sm">{member.user.fio}</td>
                          <td className="py-2 px-3 text-sm">{docs.length}</td>
                          <td className="py-2 px-3 text-sm">{uploads.length}</td>
                          <td className="py-2 px-3 text-sm">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleDownloadMemberDocs(member.user.id, member.user.fio)}
                                disabled={docs.length === 0}
                                className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                Скачать документы
                              </button>
                              <button
                                onClick={() => handleDownloadMemberUploads(member.user.id, member.user.fio)}
                                disabled={uploads.length === 0}
                                className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                Скачать загрузки
                              </button>
                              <Link
                                href={`/judge/documents?teamId=${teamId}&userId=${member.user.id}`}
                                className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                              >
                                Открыть файлы
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>

          {judgeSummaries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#71717B] mb-4">Судьи не назначены или нет результатов</p>
              <p className="text-sm text-[#71717B]">Сначала назначьте судей в разделе участники</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-lg font-semibold text-black mb-2">
                Судьи и листы оценивания
              </h2>
              {judgeSummaries.map((judge) => {
                const averagePercentage = judge.average.toFixed(2)

                return (
                  <div
                    key={judge.judgeId}
                    className="overflow-visible rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-black break-words">
                            {getJudgeLoginLabel(judge.judgeName, judge.judgeEmail)}
                          </h3>
                          <SheetStatusBadge
                            results={judge.results}
                            dishCount={dishCountForTeam}
                          />
                        </div>
                        <p className="text-xs text-[#64748B]">
                          Средний балл: {averagePercentage} / 100
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full sm:w-auto shrink-0">
                        <Link
                          href={`/judge/teams/${teamId}/judges/${judge.judgeId}`}
                          className="inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e293b] transition-colors touch-manipulation"
                        >
                          <span>Лист оценки</span>
                          <svg
                            className="h-4 w-4 shrink-0 flex-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {showEditTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-[16px] p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-black">Редактировать команду</h3>
            <div>
              <label className="block text-sm font-medium text-[#71717B] mb-1">Название</label>
              <input
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
                value={editTeamForm.name}
                onChange={(e) => setEditTeamForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#71717B] mb-1">Категория / направление</label>
              <input
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
                value={editTeamForm.category}
                onChange={(e) => setEditTeamForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#F1F5F9] hover:bg-[#E2E8F0]"
                onClick={() => setShowEditTeam(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={teamActionLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#0F172A] text-white hover:bg-[#1e293b] disabled:opacity-50"
                onClick={handleSaveTeamEdit}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
