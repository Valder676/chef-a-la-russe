'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api, Team, Upload, Result, Document } from '@/lib/api'
import { activeStageDishCount } from '@backend/lib/dish-count'
import { useLoadSeq } from '@/lib/use-load-seq'

export default function Home() {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, loading, user } = useAuth()
  const [team, setTeam] = useState<Team | null>(null)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const { nextSeq, isCurrent } = useLoadSeq()

  const loadData = useCallback(async () => {
    const seq = nextSeq()
    setDataLoading(true)
    try {
      const [teamRes, uploadsRes, documentsRes, resultsRes] = await Promise.allSettled([
        api.getTeam(),
        api.getUploads(),
        api.getDocuments(),
        api.getResults(),
      ])
      if (!isCurrent(seq)) return

      if (teamRes.status === 'fulfilled') setTeam(teamRes.value)
      if (uploadsRes.status === 'fulfilled') setUploads(uploadsRes.value)
      if (documentsRes.status === 'fulfilled') setDocuments(documentsRes.value)
      if (resultsRes.status === 'fulfilled') setResults(resultsRes.value)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      if (isCurrent(seq)) setDataLoading(false)
    }
  }, [isCurrent, nextSeq])

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (pathname === '/') loadData()
  }, [loading, isAuthenticated, router, pathname, loadData])

  const averageScoreByJudges = (stageResults: Result[]) => {
    if (stageResults.length === 0) return 0
    const groupedByJudge: { [key: string]: Result[] } = {}
    stageResults.forEach((result) => {
      if (!groupedByJudge[result.judgeId]) groupedByJudge[result.judgeId] = []
      groupedByJudge[result.judgeId].push(result)
    })
    const judgeAverages = Object.values(groupedByJudge).map((judgeResults) => {
      const total = judgeResults.reduce((sum, r) => sum + r.total, 0)
      return total / judgeResults.length
    })
    if (judgeAverages.length === 0) return 0
    return judgeAverages.reduce((sum, avg) => sum + avg, 0) / judgeAverages.length
  }

  const totalPenaltiesFor = (stageResults: Result[]) =>
    stageResults.reduce((sum, r) => sum + (r.penalties || 0), 0)

  const finalScoreForStage = (stageResults: Result[]) => {
    if (stageResults.length === 0) return 0
    return averageScoreByJudges(stageResults) - totalPenaltiesFor(stageResults)
  }

  const getDocumentStatus = (): 'confirmed' | 'pending' => {
    if (documents.length === 0) return 'pending'
    if (documents.every((d) => d.status === 'confirmed')) return 'confirmed'
    return 'pending'
  }

  const getUploadStatus = (dishNumber: number, fileType: 'photo' | 'techCard') => {
    return uploads.some(
      (u) => u.dishNumber === dishNumber && u.fileType === fileType
    )
  }

  const dishCount = team ? activeStageDishCount(team) : 3
  const dishNumbers = Array.from({ length: dishCount }, (_, i) => i + 1)
  
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }
    
    if (!isAuthenticated) {
    return null
    }
  
  const documentStatus = getDocumentStatus()
  const resultsPublished = team?.resultsPublished ?? false
  const qualifierResults = results.filter((r) => (r.stage || 'qualifier') === 'qualifier')
  const finalResults = results.filter((r) => (r.stage || 'qualifier') === 'final')
  const qualifierScore = finalScoreForStage(qualifierResults)
  const finalScoreVal = finalScoreForStage(finalResults)
  const hasAnyPublishedScores =
    qualifierResults.length > 0 || finalResults.length > 0
  const showResultScores = hasAnyPublishedScores && resultsPublished
  const resultsHiddenUntilPublish =
    !!team && results.length > 0 && !resultsPublished
  const stageLabel =
    team?.stage === 'final' ? 'Финал' : 'Квалификация'
  
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[114px] py-6 sm:py-8 md:py-10">
        <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 lg:p-10">
          <div className="flex flex-col md:flex-row justify-center gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8 md:mb-10">
          <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 w-full md:w-[365px] flex flex-col">
            <h2 className="text-[14.5px] font-semibold text-[#0F172A] mb-4 sm:mb-5 text-center">
              Статус регистрации
            </h2>
            <div className="space-y-4 sm:space-y-5 flex-grow">
              <div className="flex items-center justify-between">
                <p className="text-[13.44px] font-medium text-[#71717B]">
                  Аккаунт
                </p>
                <div className={`rounded-[10px] px-4 py-2 min-w-[120px] text-center ${
                  user?.status === 'confirmed' ? 'bg-[#0F172A]' : 'bg-[#E2E8F0]'
                }`}>
                  <span className={`text-[11.4px] font-medium ${
                    user?.status === 'confirmed' ? 'text-white' : 'text-[#0F172A]'
                  }`}>
                    {user?.status === 'confirmed' ? 'Подтверждён' : 'На проверке'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[13.44px] font-medium text-[#71717B]">
                  Документы
                </p>
                <div className={`rounded-[10px] px-4 py-2 min-w-[120px] text-center ${
                  documentStatus === 'confirmed' ? 'bg-[#0F172A]' : 'bg-[#E2E8F0]'
                }`}>
                  <span className={`text-[11.4px] font-medium ${
                    documentStatus === 'confirmed' ? 'text-white' : 'text-[#0F172A]'
                  }`}>
                    {documentStatus === 'confirmed' ? 'Подтверждены' : 'На проверке'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 sm:mt-8">
              <p className="text-[13.78px] font-medium text-[#0F172A] mb-4 text-center">
                Материалы загружаются отдельно
              </p>
              <Link
                href="/uploads"
                className="flex items-center justify-center gap-3 bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white rounded-[6px] px-4 py-2.5 text-[13.78px] font-medium transition-colors group"
              >
                <img
                  src="/icons/upload-icon.png"
                  alt="Upload"
                  width={19}
                  height={19}
                  className="brightness-0 block w-[19px] h-[19px] group-hover:invert transition-all"
                  style={{ display: 'block' }}
                />
                <span>Перейти к загрузкам</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 w-full md:w-[365px] flex flex-col">
            <h2 className="text-[15.34px] font-semibold text-[#0F172A] mb-4 sm:mb-5 text-center">
              Команда
            </h2>
            <div className="space-y-4 sm:space-y-5 flex-grow">
              {team ? (
              <div>
                <p className="text-[17.76px] font-semibold text-[#0F172A] mb-2">
                    {team.name}
                </p>
                <p className="text-[13.12px] font-medium text-[#71717B] mb-4">
                    {team.category}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[13.12px] font-medium text-[#71717B]">
                    Статус
                  </p>
                  <p className="text-[13.54px] font-medium text-black">
                      Сформирована судьями
                  </p>
                </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-[13.12px] font-medium text-[#71717B]">
                    Вы не состоите в команде
                  </p>
              </div>
              )}
            </div>
            {team && (
            <Link
              href="/my-team"
              className="flex items-center justify-center gap-3 bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white rounded-[6px] px-4 py-2.5 text-[13.97px] font-medium mt-6 sm:mt-8 transition-colors group"
            >
              <img
                src="/icons/group-icon.png"
                alt="Team"
                width={19}
                height={19}
                className="brightness-0 block w-[19px] h-[19px] group-hover:invert transition-all"
                style={{ display: 'block' }}
              />
              <span>Открыть команду</span>
            </Link>
            )}
          </div>

          <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 w-full md:w-[365px] flex flex-col">
            <h2 className="text-[14.52px] font-semibold text-[#0F172A] mb-4 sm:mb-5 text-center">
              Результаты
            </h2>
            <div className="space-y-4 sm:space-y-5 flex-grow">
              {showResultScores ? (
              <div className="space-y-4">
                {team && (
                  <p className="text-[11px] font-medium text-[#71717B] text-center leading-snug">
                    Судьи ведут оценивание этапа:{' '}
                    <span className="font-semibold text-[#0F172A]">{stageLabel}</span>
                  </p>
                )}
                {qualifierResults.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#0F172A] mb-1">Квалификация</p>
                    <p className="text-[22px] font-semibold text-[#0F172A] mb-1">
                      {qualifierScore.toFixed(2)}
                    </p>
                    <p className="text-[11px] font-medium text-[#71717B]">Итог с учётом штрафов (из 100)</p>
                  </div>
                )}
                {finalResults.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#0F172A] mb-1">Финал</p>
                    <p className="text-[22px] font-semibold text-[#0F172A] mb-1">
                      {finalScoreVal.toFixed(2)}
                    </p>
                    <p className="text-[11px] font-medium text-[#71717B]">Итог с учётом штрафов (из 100)</p>
                  </div>
                )}
                </div>
              ) : resultsHiddenUntilPublish ? (
                <div className="text-center py-2 px-1">
                  <p className="text-[13.12px] font-medium text-[#71717B] leading-relaxed">
                    Результаты будут доступны после церемонии награждения. Ожидайте объявления судей.
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-[13.12px] font-medium text-[#71717B]">
                    Результатов пока нет
                  </p>
              </div>
              )}
            </div>
            {showResultScores && (
            <Link
              href="/results"
              className="flex items-center justify-center gap-3 bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white rounded-[5.88px] px-4 py-2.5 text-[13.81px] font-medium mt-6 sm:mt-8 transition-colors group"
            >
              <img
                src="/icons/task-list-icon.png"
                alt="Results"
                width={19}
                height={19}
                className="brightness-0 block w-[19px] h-[19px] group-hover:invert transition-all"
                style={{ display: 'block' }}
              />
              <span>Смотреть разбалловку</span>
            </Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 mb-6 sm:mb-8 md:mb-10">
          <h2 className="text-[18.27px] font-semibold text-black mb-6">
            Чек-лист материалов
          </h2>
          
          <div className="space-y-6">
            {dishNumbers.map((dishNum) => (
              <div key={dishNum} className="border-2 border-[#E9EEF4] rounded-[21px] p-5">
              <h3 className="text-[18.27px] font-semibold text-black mb-5">
                  Блюдо {dishNum}
              </h3>
              <div className="space-y-4">
                <div className="border-2 border-[#E9EEF4] rounded-[21px] p-5">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`w-[29px] h-[29px] rounded flex items-center justify-center ${
                        getUploadStatus(dishNum, 'techCard') ? 'bg-[#D1FAE5]' : 'bg-[#F4F4F5]'
                      }`}>
                        {getUploadStatus(dishNum, 'techCard') ? (
                      <img
                        src="/icons/checkmark-icon.png"
                        alt="Checkmark"
                        width={19}
                        height={19}
                        className="block w-[19px] h-[19px]"
                        style={{ display: 'block' }}
                      />
                        ) : (
                          <div className="w-[10px] h-[10px] bg-[#9F9FA9] rounded"></div>
                        )}
                    </div>
                    <span className="text-[16.2px] font-semibold text-[#0E172A]">
                      Технологическая карта
                    </span>
                  </div>
                  <p className="text-[13.77px] font-medium text-[#72727D] ml-[67px]">
                    PDF/DOC
                  </p>
            </div>

                <div className="border-2 border-[#E9EEF4] rounded-[21px] p-5">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`w-[29px] h-[29px] rounded flex items-center justify-center ${
                        getUploadStatus(dishNum, 'photo') ? 'bg-[#D1FAE5]' : 'bg-[#F4F4F5]'
                      }`}>
                        {getUploadStatus(dishNum, 'photo') ? (
                      <img
                        src="/icons/checkmark-icon.png"
                        alt="Checkmark"
                        width={19}
                        height={19}
                        className="block w-[19px] h-[19px]"
                        style={{ display: 'block' }}
                      />
                        ) : (
                      <div className="w-[10px] h-[10px] bg-[#9F9FA9] rounded"></div>
                        )}
                    </div>
                    <span className="text-[16.2px] font-semibold text-[#0E172A]">
                      Фото блюда
                    </span>
                  </div>
                  <p className="text-[13.77px] font-medium text-[#72727D] ml-[67px]">
                    JPG/PNG
                  </p>
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
