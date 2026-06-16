'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { useAuth } from '@/contexts/AuthContext'
import { api, Result, Team } from '@/lib/api'
import { qualifierDishCount } from '@backend/lib/dish-count'

const FINAL_DISH_COUNT = 2

type CritKey =
  | 'miseEnPlace'
  | 'hygieneWaste'
  | 'professionalPrep'
  | 'innovation'
  | 'service'
  | 'presentation'
  | 'tasteTexture'

interface AvgCriteriaData {
  miseEnPlace: { total: string; dishes: string[] }
  hygieneWaste: { total: string; dishes: string[] }
  professionalPrep: { total: string; dishes: string[] }
  innovation: { total: string; dishes: string[] }
  service: { total: string; dishes: string[] }
  presentation: { total: string; dishes: string[] }
  tasteTexture: { total: string; dishes: string[] }
}

export default function ResultsPage() {
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()
  const [results, setResults] = useState<Result[]>([])
  const [team, setTeam] = useState<Team | null>(null)
  const [teamPlace, setTeamPlace] = useState<number | null>(null)
  const [resultsLoading, setResultsLoading] = useState(true)
  const [avgCriteria, setAvgCriteria] = useState<AvgCriteriaData | null>(null)
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    } else if (!loading && isAuthenticated) {
      loadData()
    }
  }, [loading, isAuthenticated, router])

  const loadData = async () => {
    try {
      const [teamData, resultsData] = await Promise.all([
        api.getTeam().catch(() => null),
        api.getResults().catch(() => [])
      ])

      setTeam(teamData)
      setResults(resultsData)

      const qualifierResults = resultsData.filter(r => (r.stage || 'qualifier') === 'qualifier')

      if (teamData && resultsData.length > 0) {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch('/api/results/ranking', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            const sortedTeams = await response.json()
            const place = sortedTeams.findIndex((t: any) => t.id === teamData.id) + 1
            setTeamPlace(place > 0 ? place : null)
          }
        } catch (error) {
          console.error('Error loading ranking:', error)
        }

        const qDishes = qualifierDishCount(teamData)
        setAvgCriteria(qualifierResults.length > 0 ? computeAverageCriteria(qualifierResults, qDishes) : null)
      } else {
        setAvgCriteria(null)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setResults([])
      setTeam(null)
    } finally {
      setResultsLoading(false)
    }
  }

  const computeAverageCriteria = (results: Result[], dishCount: number): AvgCriteriaData => {
    const byDish: { [d: number]: Result[] } = {}
    for (let d = 1; d <= dishCount; d++) byDish[d] = []
    results.forEach((r) => {
      if (byDish[r.dishNumber]) byDish[r.dishNumber].push(r)
    })
    const keys: CritKey[] = [
      'miseEnPlace',
      'hygieneWaste',
      'professionalPrep',
      'innovation',
      'service',
      'presentation',
      'tasteTexture',
    ]
    const maxes: Record<CritKey, number> = {
      miseEnPlace: 5,
      hygieneWaste: 10,
      professionalPrep: 15,
      innovation: 5,
      service: 5,
      presentation: 10,
      tasteTexture: 50,
    }
    const criteria: AvgCriteriaData = {
      miseEnPlace: { total: '', dishes: [] },
      hygieneWaste: { total: '', dishes: [] },
      professionalPrep: { total: '', dishes: [] },
      innovation: { total: '', dishes: [] },
      service: { total: '', dishes: [] },
      presentation: { total: '', dishes: [] },
      tasteTexture: { total: '', dishes: [] },
    }
    keys.forEach((key) => {
      const dishAvgs: number[] = []
      for (let d = 1; d <= dishCount; d++) {
        const arr = byDish[d]
        const avg = arr.length
          ? arr.reduce((s, r) => s + (Number((r as any)[key]) || 0), 0) / arr.length
          : 0
        dishAvgs.push(avg)
      }
      const meanAcrossDishes =
        dishAvgs.length > 0 ? dishAvgs.reduce((a, b) => a + b, 0) / dishCount : 0
      criteria[key] = {
        dishes: dishAvgs.map((v) => `${v.toFixed(1)} / ${maxes[key]}`),
        total: `${meanAcrossDishes.toFixed(1)} / ${maxes[key]}`,
      }
    })
    return criteria
  }

  const calculateAverageScore = (results: Result[]) => {
    if (results.length === 0) return 0
    const groupedByJudge: { [key: string]: Result[] } = {}
    results.forEach(result => {
      if (!groupedByJudge[result.judgeId]) {
        groupedByJudge[result.judgeId] = []
      }
      groupedByJudge[result.judgeId].push(result)
    })

    const judgeAverages = Object.values(groupedByJudge).map(judgeResults => {
      const total = judgeResults.reduce((sum, r) => sum + r.total, 0)
      return total / judgeResults.length
    })

    if (judgeAverages.length === 0) return 0
    return judgeAverages.reduce((sum, avg) => sum + avg, 0) / judgeAverages.length
  }

  const calculateTotalPenalties = (_results: Result[]) => 0

  const getProgressPercentage = (score: string) => {
    const [current, max] = score.split(' / ').map(Number)
    if (!max || max === 0) return 0
    return (current / max) * 100
  }

  if (loading || resultsLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const qualifierOnly = results.filter(r => (r.stage || 'qualifier') === 'qualifier')
  const finalOnly = results.filter(r => (r.stage || 'qualifier') === 'final')
  const activeResults = qualifierOnly
  const qualifierGridDishes = team ? qualifierDishCount(team) : 3
  const finalAvgCriteria =
    finalOnly.length > 0 ? computeAverageCriteria(finalOnly, FINAL_DISH_COUNT) : null

  const averageScore = calculateAverageScore(activeResults)
  const totalPenalties = calculateTotalPenalties(activeResults)
  const finalScore = averageScore

  const penaltiesList = activeResults
    .filter(r => (r.penalties || 0) > 0)
    .map(result => ({
      name: `Штраф: блюдо ${result.dishNumber}`,
      value: `-${result.penalties?.toFixed(0) || 0}`
    }))

  const resultsNotPublished = team && results.length > 0 && !team.resultsPublished

  if (resultsNotPublished) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-6 sm:py-8 md:py-10">
          <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-8 sm:p-10">
            <h1 className="text-xl md:text-[23px] font-semibold text-black mb-4">
              Результаты и разбалловка
            </h1>
            <p className="text-[#71717B] text-base">
              Результаты будут доступны после церемонии награждения. Ожидайте объявления судей.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-6 sm:py-8 md:py-10">
        <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-5 sm:p-6 md:p-8 lg:p-10">
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-6 sm:mb-8">
              <div>
                <p className="text-xs sm:text-[13.92px] font-medium text-[#71717B] mb-2">
                  Итоги
                </p>
                <h1 className="text-lg sm:text-xl md:text-[23.34px] font-semibold text-black">
                  Результаты и разбалловка
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {team?.category && (
                  <div className="bg-[#0E172A] rounded-[20.24px] px-4 py-2">
                    <span className="text-[11.8px] font-semibold text-white">
                      {team.category}
                    </span>
                  </div>
                )}
                {teamPlace && (
                  <div className="bg-[#F1F5F9] rounded-[20.24px] px-4 py-2">
                    <span className="text-[11.69px] font-semibold text-black">
                      Место: {teamPlace}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {team && (
            <div className="mb-6 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-sm text-[#334155] leading-relaxed">
                <span className="font-semibold text-[#0F172A]">Этап команды в чемпионате:</span>{' '}
                {team.stage === 'final' ? 'финал' : 'квалификация'}. Судьи выставляют баллы за выбранный этап; ниже отдельно показаны{' '}
                <span className="font-medium">квалификация</span>
                {finalOnly.length > 0 ? (
                  <> и <span className="font-medium">финал</span></>
                ) : (
                  ''
                )}
                .
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {qualifierOnly.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-[#0F172A] px-3 py-1 text-[11px] font-semibold text-white">
                    Оценки квалификации в системе
                  </span>
                )}
                {finalOnly.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-[#475569] px-3 py-1 text-[11px] font-semibold text-white">
                    Оценки финала в системе
                  </span>
                )}
              </div>
            </div>
          )}

          {results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#71717B] mb-2">Результаты пока отсутствуют</p>
              <p className="text-[13px] text-[#71717B]">Результаты появятся после оценивания судьями</p>
            </div>
          ) : !avgCriteria ? null : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8 md:mb-10">
                <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-5 sm:p-6 md:p-8">
                  <h2 className="text-[15.25px] font-semibold text-black mb-1 sm:mb-2 md:mb-2">
                    Квалификация: сводный балл команды
                  </h2>
                  <p className="text-[12px] font-medium text-[#71717B] mb-4 sm:mb-5 md:mb-6">
                    Оценки судей за этап квалификации
                  </p>

                  <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
                    <div className="bg-white border border-[#E3E9F0] rounded-[19px] p-3 sm:p-4">
                      <p className="text-[11.57px] font-medium text-[#71717B] mb-2">
                        Среднее по судьям
                      </p>
                      <p className="text-[24.59px] font-semibold text-[#0F172A]">
                        {averageScore.toFixed(2)} / 100
                      </p>
                    </div>

                    <div className="bg-white border border-[#E3E9F0] rounded-[19px] p-3 sm:p-4">
                      <p className="text-[11.57px] font-medium text-[#71717B] mb-2">
                        Штрафы
                      </p>
                      <p className="text-[24.59px] font-semibold text-[#0F172A] mb-1">
                        {totalPenalties > 0 ? '-' : ''}{totalPenalties.toFixed(0)}
                      </p>
                      {totalPenalties > 0 && (
                        <p className="text-[11.57px] font-medium text-[#71717B]">
                          Сумма штрафных баллов
                        </p>
                      )}
                    </div>

                    <div className="bg-white border border-[#E3E9F0] rounded-[19px] p-3 sm:p-4">
                      <p className="text-[11.57px] font-medium text-[#71717B] mb-2">
                        Итог
                      </p>
                      <p className="text-[24.59px] font-semibold text-[#0F172A] mb-1">
                        {finalScore.toFixed(2)} / 100
                      </p>
                      <p className="text-[11.57px] font-medium text-[#71717B]">
                        Среднее по судьям - штрафы
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 sm:mb-5 md:mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11.57px] font-medium text-[#71717B]">
                        Прогресс до 100
                      </p>
                      <p className="text-[15.12px] font-semibold text-black">
                        {finalScore.toFixed(2)} / 100
                      </p>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-2 sm:h-2.5">
                      <div
                        className="bg-[#0F172A] h-full rounded-full transition-all"
                        style={{ width: `${Math.min((finalScore / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {totalPenalties > 0 && penaltiesList.length > 0 && (
                    <div className="bg-[#F1F5F9] border border-[#E3E9F0] rounded-[19px] p-4 sm:p-5">
                      <h3 className="text-[13.61px] font-semibold text-black mb-3 sm:mb-4">
                        Штрафы
                      </h3>
                      <div className="space-y-2">
                        {penaltiesList.map((penalty, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <p className="text-[13.52px] font-medium text-[#71717B]">
                              {penalty.name}
                            </p>
                            <p className="text-[13.61px] font-semibold text-black">{penalty.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-5 sm:p-6 md:p-8">
                  <h3 className="text-[14.99px] font-semibold text-black mb-4 sm:mb-5 md:mb-6">
                    Справка
                  </h3>
                  <div className="bg-white border border-[#E3E9F0] rounded-[19px] p-3 sm:p-4">
                    <p className="text-[14.33px] font-medium text-[#71717B] mb-2">
                      Максимум за одно блюдо
                    </p>
                    <p className="text-[22.36px] font-semibold text-black mb-3">100 баллов</p>
                    <p className="text-[12px] font-medium text-[#71717B] leading-relaxed">
                      Сводный балл команды слева — среднее оценок всех судей за квалификацию (тоже из 100).
                      В таблице ниже — средние баллы по каждому критерию и блюду.
                    </p>
                  </div>
                </div>
              </div>

              {avgCriteria && (
                <div className="bg-white rounded-[21px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-5 sm:p-6 md:p-8 mb-6 sm:mb-8 md:mb-10">
                  <div className="mb-4 sm:mb-5 md:mb-6">
                    <p className="text-sm sm:text-base md:text-[15.25px] font-semibold text-black">
                      Средняя разбалловка по критериям
                    </p>
                  </div>
                  <div className="border border-[#E2E8F0] rounded-[21px] p-5 sm:p-6 md:p-8 overflow-x-auto">
                    <div
                      className="grid gap-3 sm:gap-4 pb-2 mb-4"
                      style={{ gridTemplateColumns: `2fr ${'1fr '.repeat(qualifierGridDishes).trim()} 1fr` }}
                    >
                      <div className="text-left">
                        <p className="text-[13.71px] font-semibold text-[#71717B]">Критерий</p>
                      </div>
                      {Array.from({ length: qualifierGridDishes }, (_, i) => (
                        <div key={i} className="text-center">
                          <p className="text-[13.71px] font-semibold text-[#71717B]">
                            Блюдо {i + 1}
                          </p>
                        </div>
                      ))}
                      <div className="text-center">
                        <p className="text-[13.71px] font-semibold text-[#71717B]">Среднее</p>
                      </div>
                    </div>
                    {[
                      { key: 'miseEnPlace' as CritKey, title: 'Организация рабочего места (mise en place)', max: 5 },
                      { key: 'hygieneWaste' as CritKey, title: 'Гигиена и пищевые отходы', max: 10 },
                      { key: 'professionalPrep' as CritKey, title: 'Правильное профессиональное приготовление', max: 15 },
                      { key: 'innovation' as CritKey, title: 'Инновационность', max: 5 },
                      { key: 'service' as CritKey, title: 'Сервис', max: 5 },
                      { key: 'presentation' as CritKey, title: 'Презентация', max: 10 },
                      { key: 'tasteTexture' as CritKey, title: 'Вкус и текстура', max: 50 },
                    ].map(({ key, title, max }) => (
                      <div key={key} className="bg-transparent border border-[#E2E8F0] rounded-[19px] p-4 sm:p-5 mb-3 last:mb-0">
                        <div
                          className="grid gap-3 sm:gap-4 place-items-center [&>div:first-child]:place-self-start"
                          style={{ gridTemplateColumns: `2fr ${'1fr '.repeat(qualifierGridDishes).trim()} 1fr` }}
                        >
                          <div>
                            <p className="text-[13.71px] font-semibold text-black mb-1">{title}</p>
                            <p className="text-[11.62px] font-medium text-[#71717B]">max: {max} за блюдо</p>
                          </div>
                          {avgCriteria[key].dishes.map((score, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                              <p className="text-[15.12px] font-semibold text-black mb-1">{score}</p>
                              <div className="w-full max-w-[60px] bg-[#F1F5F9] rounded-full h-1.5">
                                <div
                                  className="bg-[#0F172A] h-full rounded-full"
                                  style={{ width: `${getProgressPercentage(score)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                          <div className="text-center">
                            <p className="text-[15.12px] font-semibold text-black mb-1">{avgCriteria[key].total}</p>
                            <div className="w-full max-w-[60px] bg-[#F1F5F9] rounded-full h-1.5">
                              <div
                                className="bg-[#0F172A] h-full rounded-full"
                                style={{ width: `${getProgressPercentage(avgCriteria[key].total)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {finalOnly.length > 0 && finalAvgCriteria && (
                <div className="bg-white rounded-[21px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-5 sm:p-6 md:p-8 mb-6 sm:mb-8 md:mb-10">
                  <div className="mb-4 sm:mb-5 md:mb-6">
                    <p className="text-sm sm:text-base md:text-[15.25px] font-semibold text-black">
                      Финал: средняя разбалловка по критериям
                    </p>
                    <p className="text-[12px] font-medium text-[#71717B] mb-4 sm:mb-5 md:mb-6">
                      Оценки судей за этап финала
                    </p>
                  </div>
                  <div className="border border-[#E2E8F0] rounded-[21px] p-5 sm:p-6 md:p-8 overflow-x-auto">
                    <div
                      className="grid gap-3 sm:gap-4 pb-2 mb-4"
                      style={{ gridTemplateColumns: `2fr ${'1fr '.repeat(FINAL_DISH_COUNT).trim()} 1fr` }}
                    >
                      <div className="text-left">
                        <p className="text-[13.71px] font-semibold text-[#71717B]">Критерий</p>
                      </div>
                      {Array.from({ length: FINAL_DISH_COUNT }, (_, i) => (
                        <div key={i} className="text-center">
                          <p className="text-[13.71px] font-semibold text-[#71717B]">
                            Блюдо {i + 1}
                          </p>
                        </div>
                      ))}
                      <div className="text-center">
                        <p className="text-[13.71px] font-semibold text-[#71717B]">Среднее</p>
                      </div>
                    </div>
                    {[
                      { key: 'miseEnPlace' as CritKey, title: 'Организация рабочего места (mise en place)', max: 5 },
                      { key: 'hygieneWaste' as CritKey, title: 'Гигиена и пищевые отходы', max: 10 },
                      { key: 'professionalPrep' as CritKey, title: 'Правильное профессиональное приготовление', max: 15 },
                      { key: 'innovation' as CritKey, title: 'Инновационность', max: 5 },
                      { key: 'service' as CritKey, title: 'Сервис', max: 5 },
                      { key: 'presentation' as CritKey, title: 'Презентация', max: 10 },
                      { key: 'tasteTexture' as CritKey, title: 'Вкус и текстура', max: 50 },
                    ].map(({ key, title, max }) => (
                      <div key={key} className="bg-transparent border border-[#E2E8F0] rounded-[19px] p-4 sm:p-5 mb-3 last:mb-0">
                        <div
                          className="grid gap-3 sm:gap-4 place-items-center [&>div:first-child]:place-self-start"
                          style={{ gridTemplateColumns: `2fr ${'1fr '.repeat(FINAL_DISH_COUNT).trim()} 1fr` }}
                        >
                          <div>
                            <p className="text-[13.71px] font-semibold text-black mb-1">{title}</p>
                            <p className="text-[11.62px] font-medium text-[#71717B]">max: {max} за блюдо</p>
                          </div>
                          {finalAvgCriteria[key].dishes.map((score, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                              <p className="text-[15.12px] font-semibold text-black mb-1">{score}</p>
                              <div className="w-full max-w-[60px] bg-[#F1F5F9] rounded-full h-1.5">
                                <div
                                  className="bg-[#0F172A] h-full rounded-full"
                                  style={{ width: `${getProgressPercentage(score)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                          <div className="text-center">
                            <p className="text-[15.12px] font-semibold text-black mb-1">{finalAvgCriteria[key].total}</p>
                            <div className="w-full max-w-[60px] bg-[#F1F5F9] rounded-full h-1.5">
                              <div
                                className="bg-[#0F172A] h-full rounded-full"
                                style={{ width: `${getProgressPercentage(finalAvgCriteria[key].total)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
