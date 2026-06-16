'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import JudgeHeader from '@/components/judge/JudgeHeader'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api, Result, User, ViolationPhoto } from '@/lib/api'
import { JudgeSheetConfirm, JudgeSheetToast } from '@/components/judge/JudgeSheetFeedback'
import ViolationPhotosSection from '@/components/judge/ViolationPhotosSection'
import {
  buildPhotosIndex,
  resultsToByDish,
  ViolationCriterionKey,
} from '@/lib/violation-photos'
import { activeStageDishCount } from '@backend/lib/dish-count'
import StatusBadge from '@/components/ui/StatusBadge'

type CriterionKey =
  | 'miseEnPlace'
  | 'hygieneWaste'
  | 'professionalPrep'
  | 'innovation'
  | 'service'
  | 'presentation'
  | 'tasteTexture'

interface CriterionData {
  key: CriterionKey
  title: string
  max: number
}

function getJudgeLoginLabel(judge?: User | null) {
  if (judge?.fio?.trim()) return judge.fio.trim()
  const loginFromEmail = judge?.email?.split('@')[0]?.trim()
  if (loginFromEmail) return loginFromEmail
  return 'Судья'
}

export default function JudgeDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string
  const judgeId = params.judgeId as string
  
  const { isAuthenticated, loading, user } = useAuth()
  const [team, setTeam] = useState<any>(null)
  const [judge, setJudge] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  
  const [formData, setFormData] = useState<{
    [K in CriterionKey]: { [dishNumber: number]: number }
  }>({
    miseEnPlace: { 1: 0, 2: 0, 3: 0 },
    hygieneWaste: { 1: 0, 2: 0, 3: 0 },
    professionalPrep: { 1: 0, 2: 0, 3: 0 },
    innovation: { 1: 0, 2: 0, 3: 0 },
    service: { 1: 0, 2: 0, 3: 0 },
    presentation: { 1: 0, 2: 0, 3: 0 },
    tasteTexture: { 1: 0, 2: 0, 3: 0 },
  })
  
  const [penalties, setPenalties] = useState<{ [dishNumber: number]: number }>({ 1: 0, 2: 0, 3: 0 })
  const [comments, setComments] = useState<{ [criterion: string]: string }>({})
  const [isFixed, setIsFixed] = useState(false)
  const [stage, setStage] = useState<'qualifier' | 'final'>('qualifier')
  const [dishCount, setDishCount] = useState(3)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null)
  const [confirmSheet, setConfirmSheet] = useState<null | { mode: 'fix' | 'unfix' }>(null)
  const [resultsByDish, setResultsByDish] = useState<Record<number, Result>>({})
  const [photosIndex, setPhotosIndex] = useState<Record<string, ViolationPhoto[]>>({})
  const [photoUploadKey, setPhotoUploadKey] = useState<string | null>(null)

  const notify = (message: string, variant: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, variant })
  }

  const canEdit = user?.id === judgeId

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (user?.role !== 'judge') {
        router.push('/')
      } else if (teamId && judgeId) {
        loadData()
      }
    }
  }, [loading, isAuthenticated, user, router, teamId, judgeId])

  const loadData = async () => {
    try {
      const [teamData, judgesData, resultsData] = await Promise.all([
        api.getJudgeTeam(teamId),
        api.getJudges(),
        api.getJudgeResultsByStage(teamId, judgeId, 'qualifier'),
      ])

      setTeam(teamData)
      const teamStage: 'qualifier' | 'final' = teamData?.stage === 'final' ? 'final' : 'qualifier'
      setStage(teamStage)

      const foundJudge = judgesData.find((j: User) => j.id === judgeId)
      setJudge(foundJudge || null)
      const stageResults =
        teamStage === 'final'
          ? await api.getJudgeResultsByStage(teamId, judgeId, 'final')
          : resultsData
      const dishCountVal = activeStageDishCount(teamData)
      setDishCount(dishCountVal)

      const initDishMap = (count: number) => {
        const map: { [dishNumber: number]: number } = {}
        for (let d = 1; d <= count; d++) map[d] = 0
        return map
      }

      const initialFormData: typeof formData = {
        miseEnPlace: initDishMap(dishCountVal),
        hygieneWaste: initDishMap(dishCountVal),
        professionalPrep: initDishMap(dishCountVal),
        innovation: initDishMap(dishCountVal),
        service: initDishMap(dishCountVal),
        presentation: initDishMap(dishCountVal),
        tasteTexture: initDishMap(dishCountVal),
      }
      
      const initialPenalties: { [dishNumber: number]: number } = initDishMap(dishCountVal)
      
      stageResults.forEach((result: Result) => {
        initialFormData.miseEnPlace[result.dishNumber] = result.miseEnPlace
        initialFormData.hygieneWaste[result.dishNumber] = result.hygieneWaste
        initialFormData.professionalPrep[result.dishNumber] = result.professionalPrep
        initialFormData.innovation[result.dishNumber] = result.innovation
        initialFormData.service[result.dishNumber] = result.service
        initialFormData.presentation[result.dishNumber] = result.presentation
        initialFormData.tasteTexture[result.dishNumber] = result.tasteTexture
        initialPenalties[result.dishNumber] = result.penalties || 0
      })
      
      setFormData(initialFormData)
      setPenalties(initialPenalties)
      
      const byDish = resultsToByDish(stageResults)
      setResultsByDish(byDish)
      setPhotosIndex(buildPhotosIndex(byDish))

      const allResultsFixed = stageResults.length > 0 && stageResults.every((r: any) => r.status === 'fixed')
      setIsFixed(allResultsFixed)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const handleSave = async () => {
    if (!canEdit) return
    if (isFixed) {
      notify('Лист зафиксирован, редактирование невозможно', 'info')
      return
    }
    
    setSaving(true)
    try {
      for (const dishNumber of dishNumbers) {
        await api.saveJudgeResult(teamId, judgeId, {
          dishNumber,
          stage,
          miseEnPlace: Number(formData.miseEnPlace[dishNumber]) || 0,
          hygieneWaste: Number(formData.hygieneWaste[dishNumber]) || 0,
          professionalPrep: Number(formData.professionalPrep[dishNumber]) || 0,
          innovation: Number(formData.innovation[dishNumber]) || 0,
          service: Number(formData.service[dishNumber]) || 0,
          presentation: Number(formData.presentation[dishNumber]) || 0,
          tasteTexture: Number(formData.tasteTexture[dishNumber]) || 0,
          penalties: Number(penalties[dishNumber]) || 0,
        })
      }
      await loadData()
      notify('Оценки успешно сохранены', 'success')
    } catch (error: any) {
      console.error('Error saving results:', error)
      notify(error?.message || 'Ошибка сохранения. Проверьте введенные данные.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const runFixSheet = async () => {
    try {
      await api.fixResultSheet(teamId, judgeId, stage)
      setIsFixed(true)
      notify('Лист успешно зафиксирован', 'success')
      await loadData()
    } catch (error: any) {
      notify(error.message || 'Ошибка фиксации листа', 'error')
    }
  }

  const runUnfixSheet = async () => {
    try {
      await api.unfixResultSheet(teamId, judgeId, stage)
      setIsFixed(false)
      notify('Лист успешно разблокирован', 'success')
      await loadData()
    } catch (error: any) {
      notify(error.message || 'Ошибка разблокировки листа', 'error')
    }
  }

  const handleFixSheet = () => {
    if (!canEdit) return
    setConfirmSheet({ mode: 'fix' })
  }

  const handleUnfixSheet = () => {
    if (!canEdit) return
    setConfirmSheet({ mode: 'unfix' })
  }

  const criteria: CriterionData[] = [
    { key: 'miseEnPlace', title: 'Организация рабочего места (mise en place)', max: 5 },
    { key: 'hygieneWaste', title: 'Гигиена и пищевые отходы', max: 10 },
    { key: 'professionalPrep', title: 'Правильное профессиональное приготовление', max: 15 },
    { key: 'innovation', title: 'Инновационность', max: 5 },
    { key: 'service', title: 'Сервис', max: 5 },
    { key: 'presentation', title: 'Презентация', max: 10 },
    { key: 'tasteTexture', title: 'Вкус и текстура', max: 50 },
  ]

  const dishNumbers = Array.from({ length: dishCount }, (_, i) => i + 1)

  const getCriterionTotal = (criterionKey: CriterionKey) => {
    return dishNumbers.reduce((sum, d) => sum + (formData[criterionKey][d] || 0), 0)
  }

  const getCriterionMax = (criterionKey: CriterionKey) => {
    const criterion = criteria.find((c) => c.key === criterionKey)
    return criterion ? criterion.max * dishCount : 0
  }

  const getDishTotal = (dishNumber: number) => {
    const raw =
      formData.miseEnPlace[dishNumber] +
      formData.hygieneWaste[dishNumber] +
      formData.professionalPrep[dishNumber] +
      formData.innovation[dishNumber] +
      formData.service[dishNumber] +
      formData.presentation[dishNumber] +
      formData.tasteTexture[dishNumber]
    return Math.max(0, Math.min(100, raw - (penalties[dishNumber] || 0)))
  }

  const getOverallAverage = () => {
    const dishTotals = dishNumbers.map((d) => getDishTotal(d))
    return dishTotals.reduce((sum, v) => sum + v, 0) / dishCount
  }

  const getProgressPercentage = (criterionKey: CriterionKey) => {
    const total = getCriterionTotal(criterionKey)
    const max = getCriterionMax(criterionKey)
    return max > 0 ? (total / max) * 100 : 0
  }

  const normalizeScoreInput = (raw: string, max: number) => {
    const normalized = raw.replace(',', '.').trim()
    if (normalized === '') return 0
    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) return 0
    return Math.max(0, Math.min(max, parsed))
  }

  const updateCriterionScore = (
    criterionKey: CriterionKey,
    dishNumber: number,
    max: number,
    nextValue: number
  ) => {
    const value = Math.max(0, Math.min(max, nextValue))
    setFormData(prev => ({
      ...prev,
      [criterionKey]: {
        ...prev[criterionKey],
        [dishNumber]: value,
      },
    }))
  }

  const syncViolationPhotos = (stageResults: Result[]) => {
    const byDish = resultsToByDish(stageResults)
    setResultsByDish(byDish)
    setPhotosIndex(buildPhotosIndex(byDish))
  }

  const refreshViolationPhotos = async () => {
    const stageResults = await api.getJudgeResultsByStage(teamId, judgeId, stage)
    syncViolationPhotos(stageResults)
  }

  const ensureResultForDish = async (dishNumber: number): Promise<string> => {
    const existing = resultsByDish[dishNumber]
    if (existing?.id) return existing.id

    const saved = await api.saveJudgeResult(teamId, judgeId, {
      dishNumber,
      stage,
      miseEnPlace: Number(formData.miseEnPlace[dishNumber]) || 0,
      hygieneWaste: Number(formData.hygieneWaste[dishNumber]) || 0,
      professionalPrep: Number(formData.professionalPrep[dishNumber]) || 0,
      innovation: Number(formData.innovation[dishNumber]) || 0,
      service: Number(formData.service[dishNumber]) || 0,
      presentation: Number(formData.presentation[dishNumber]) || 0,
      tasteTexture: Number(formData.tasteTexture[dishNumber]) || 0,
      penalties: Number(penalties[dishNumber]) || 0,
    })
    setResultsByDish((prev) => ({
      ...prev,
      [dishNumber]: {
        ...saved,
        violationPhotos: prev[dishNumber]?.violationPhotos ?? [],
      },
    }))
    return saved.id
  }

  const handleViolationPhotoUpload = async (
    criterionKey: ViolationCriterionKey,
    dishNumber: number,
    file: File
  ) => {
    if (!canEdit || isFixed) return
    const uploadKey = `${criterionKey}-${dishNumber}`
    setPhotoUploadKey(uploadKey)
    try {
      const resultId = await ensureResultForDish(dishNumber)
      await api.uploadViolationPhoto(resultId, criterionKey, file)
      await refreshViolationPhotos()
      notify('Фото загружено', 'success')
    } catch (error: any) {
      notify(error?.message || 'Ошибка загрузки фото', 'error')
    } finally {
      setPhotoUploadKey(null)
    }
  }

  const handleViolationPhotoDelete = async (photoId: string) => {
    if (!canEdit) {
      notify('Нельзя удалять фото в чужом листе', 'info')
      return
    }
    if (isFixed) {
      notify('Лист зафиксирован. Разблокируйте лист, чтобы удалить фото.', 'info')
      return
    }
    try {
      await api.deleteViolationPhoto(photoId)
      await refreshViolationPhotos()
      notify('Фото удалено', 'success')
    } catch (error: any) {
      notify(error?.message || 'Ошибка удаления фото', 'error')
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

  return (
    <div className="min-h-screen">
      {toast && (
        <JudgeSheetToast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
      <JudgeSheetConfirm
        open={confirmSheet !== null}
        title={confirmSheet?.mode === 'unfix' ? 'Разблокировать лист?' : 'Зафиксировать лист?'}
        message={
          confirmSheet?.mode === 'unfix'
            ? 'После разблокировки редактирование оценок снова станет доступным.'
            : 'После фиксации редактирование листа будет недоступно. Продолжить?'
        }
        confirmLabel={confirmSheet?.mode === 'unfix' ? 'Разблокировать' : 'Зафиксировать'}
        onCancel={() => setConfirmSheet(null)}
        onConfirm={() => {
          const mode = confirmSheet?.mode
          setConfirmSheet(null)
          if (mode === 'fix') void runFixSheet()
          else if (mode === 'unfix') void runUnfixSheet()
        }}
      />
      <JudgeHeader />
      
      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-4 sm:py-8 md:py-10 pb-safe">
        <div className="bg-white rounded-[20px] sm:rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-4 sm:p-7 md:p-8 lg:p-10 mx-auto max-w-[1220px]">
          <div className="mb-5 sm:mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[#71717B] text-xs sm:text-sm mb-1.5">
                Команда
              </p>
              <h1 className="text-lg sm:text-[23px] font-semibold text-black mb-1.5 underline decoration-[#0F172A] decoration-1 break-words">
                {team?.name || 'Неизвестно'}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-[#71717B] text-xs sm:text-sm">
                  {getJudgeLoginLabel(judge)}
                </p>
                {isFixed ? (
                  <StatusBadge variant="fixed" label="Зафиксировано" showLock />
                ) : (
                  <StatusBadge variant="in_progress" label="Редактирование" showDot />
                )}
              </div>
            </div>
            <div className="flex flex-row sm:flex-col items-stretch sm:items-end justify-between sm:justify-start gap-2 sm:gap-2 w-full sm:w-auto shrink-0">
              <div className="bg-[#0F172A] text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-[8px] text-center sm:text-right flex-1 sm:flex-none">
                <p className="text-[10px] sm:text-xs font-medium text-white/80 uppercase tracking-wide">Средний балл</p>
                <div className="text-base sm:text-[18px] font-semibold tabular-nums">
                  {getOverallAverage().toFixed(2)} / 100
                </div>
              </div>
              <Link
                href={`/judge/teams/${teamId}`}
                className="inline-flex items-center justify-center bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-4 py-2.5 rounded-[8px] text-sm font-semibold transition-colors min-h-[44px] sm:min-h-0 touch-manipulation"
              >
                Назад
              </Link>
            </div>
          </div>

          {!canEdit && (
            <div className="mb-6 rounded-[12px] border border-[#E9EEF4] bg-[#F8FAFC] px-4 py-3 text-sm text-[#475569]">
              Режим просмотра: вы смотрите лист другого судьи. Изменять оценки и фиксацию может только владелец листа.
            </div>
          )}

          <div className="space-y-5 sm:space-y-6">
            <p className="sm:hidden text-xs text-[#64748B] flex items-center gap-1.5">
              <span className="inline-block w-4 h-px bg-slate-300" aria-hidden />
              Таблицу можно листать горизонтально
            </p>
            <div className="judge-table-wrap border-2 shadow-none sm:shadow-sm">
              <div className="overflow-x-auto overscroll-x-contain -mx-px">
                <table className="w-full min-w-[720px] sm:min-w-0">
                <thead>
                  <tr className="bg-[#F1F5F9]">
                    <th className="sticky left-0 z-10 bg-[#F1F5F9] px-3 py-3 sm:px-6 sm:py-4 text-left text-xs sm:text-sm font-semibold text-[#71717B] min-w-[140px] sm:min-w-0 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]">Критерий</th>
                    {dishNumbers.map(d => (
                      <th key={d} className="px-2 py-3 sm:px-6 sm:py-4 text-center text-xs sm:text-sm font-semibold text-[#71717B] whitespace-nowrap">
                        Блюдо {d}
                      </th>
                    ))}
                    <th className="px-2 py-3 sm:px-6 sm:py-4 text-center text-xs sm:text-sm font-semibold text-[#71717B] whitespace-nowrap">
                      Σ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((criterion) => {
                    const total = getCriterionTotal(criterion.key)
                    const max = getCriterionMax(criterion.key)
                    const progress = getProgressPercentage(criterion.key)
                    
                    return (
                      <React.Fragment key={criterion.key}>
                        <tr>
                          <td className="sticky left-0 z-[1] bg-white px-3 py-3 sm:px-6 sm:py-4 border-b-0 align-top shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)]">
                            <div>
                              <h3 className="text-sm sm:text-[16px] font-semibold text-black mb-1 leading-snug">
                                {criterion.title}
                              </h3>
                              <p className="text-[10px] sm:text-xs text-[#71717B]">
                                max {criterion.max}/блюдо
                              </p>
                            </div>
                          </td>
                          {dishNumbers.map((dishNumber) => (
                            <td key={dishNumber} className="px-2 py-3 sm:px-6 sm:py-4 text-center border-b-0 align-middle">
                              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isFixed || !canEdit) return
                                    const current = formData[criterion.key][dishNumber] || 0
                                    updateCriterionScore(criterion.key, dishNumber, criterion.max, current - 1)
                                  }}
                                  disabled={isFixed || !canEdit}
                                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-[#E9EEF4] bg-[#F8FAFC] text-sm font-semibold text-black disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                                  aria-label="Уменьшить балл"
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*[.,]?[0-9]*"
                                  value={formData[criterion.key][dishNumber] || 0}
                                  onChange={(e) => {
                                    if (isFixed || !canEdit) return
                                    const value = normalizeScoreInput(e.target.value, criterion.max)
                                    updateCriterionScore(criterion.key, dishNumber, criterion.max, value)
                                  }}
                                  disabled={isFixed || !canEdit}
                                  className="w-[3.25rem] sm:w-16 min-h-[44px] sm:min-h-0 px-1.5 sm:px-3 py-2 border border-[#E9EEF4] rounded-lg text-sm text-center disabled:bg-gray-100 disabled:cursor-not-allowed bg-white touch-manipulation"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isFixed || !canEdit) return
                                    const current = formData[criterion.key][dishNumber] || 0
                                    updateCriterionScore(criterion.key, dishNumber, criterion.max, current + 1)
                                  }}
                                  disabled={isFixed || !canEdit}
                                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-[#E9EEF4] bg-[#F8FAFC] text-sm font-semibold text-black disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                                  aria-label="Увеличить балл"
                                >
                                  +
                                </button>
                                <span className="text-xs sm:text-sm text-[#71717B] tabular-nums">
                                  /{criterion.max}
                                </span>
                              </div>
                            </td>
                          ))}
                          <td className="px-2 py-3 sm:px-6 sm:py-4 text-center border-b-0 align-middle">
                            <div className="text-sm sm:text-[16px] font-semibold text-black tabular-nums">
                              {total} / {max}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={dishCount + 2} className="px-3 py-4 sm:px-6 bg-white border-t border-[#F1F5F9]">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-semibold text-black mb-2">
                                  Комментарий по критерию
                                </label>
                                <textarea
                                  value={comments[criterion.key] || ''}
                                  onChange={(e) => {
                                    if (isFixed || !canEdit) return
                                    setComments(prev => ({ ...prev, [criterion.key]: e.target.value }))
                                  }}
                                  placeholder="Введите комментарий (за что сняты баллы)"
                                  disabled={isFixed || !canEdit}
                                  className="w-full px-4 py-2 border border-[#E9EEF4] rounded-lg text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
                                  rows={3}
                                />
                              </div>

                              <ViolationPhotosSection
                                criterionKey={criterion.key}
                                dishNumbers={dishNumbers}
                                photosIndex={photosIndex}
                                canEdit={canEdit}
                                isFixed={isFixed}
                                uploadingKey={photoUploadKey}
                                onUpload={(dishNumber, file) =>
                                  handleViolationPhotoUpload(criterion.key, dishNumber, file)
                                }
                                onDelete={handleViolationPhotoDelete}
                              />

                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-[#0F172A] h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>

            <div className="border-2 border-[#E9EEF4] rounded-[16px] sm:rounded-[21px] p-4 sm:p-6 bg-gray-50">
              <h3 className="text-base sm:text-[18px] font-semibold text-black mb-2 sm:mb-4">Итог по команде</h3>
              <p className="text-xs sm:text-sm text-[#71717B] mb-3 leading-relaxed">
                По регламенту за каждое блюдо — до 100 баллов; итоговый показатель — среднее по блюдам.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                  {dishNumbers.map((d) => (
                    <div key={d} className="text-sm font-semibold text-black tabular-nums">
                      Блюдо {d}: {getDishTotal(d).toFixed(1)} / 100
                    </div>
                  ))}
                </div>
                <div className="text-base sm:text-[18px] font-semibold text-[#0F172A] pt-1 border-t border-slate-200/80 sm:border-0 sm:pt-0 tabular-nums">
                  Средний балл: {getOverallAverage().toFixed(2)} / 100
                </div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="mt-6 sm:mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
              <button
                onClick={handleSave}
                disabled={saving || isFixed}
                className="flex w-full sm:w-auto items-center justify-center gap-2 bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-6 py-3.5 sm:py-3 rounded-[8px] text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Сохранить
              </button>
              {isFixed ? (
                <button
                  onClick={handleUnfixSheet}
                  disabled={saving}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] text-white px-6 py-3.5 sm:py-3 rounded-[8px] text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Разблокировать лист
                </button>
              ) : (
                <button
                  onClick={handleFixSheet}
                  disabled={saving}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 bg-[#0F172A] text-white px-6 py-3.5 sm:py-3 rounded-[8px] text-sm font-semibold hover:bg-[#1e293b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Зафиксировать лист
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
