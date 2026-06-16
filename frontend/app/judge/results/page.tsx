'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import JudgeHeader from '@/components/judge/JudgeHeader'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

interface TeamResult {
  id: string
  name: string
  category: string
  avgScore: number
  totalScore: number
  place: number
}

export default function JudgeResultsPage() {
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()
  const [results, setResults] = useState<TeamResult[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (user?.role !== 'judge') {
        router.push('/')
      } else {
        loadResults()
      }
    }
  }, [loading, isAuthenticated, user, router])

  const loadResults = async () => {
    try {
      const data = await api.getJudgeResults()
      setResults(data || [])
    } catch (error) {
      console.error('Error loading judge results:', error)
      setResults([])
    } finally {
      setDataLoading(false)
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
      <JudgeHeader />

      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-4 sm:py-8 md:py-10 pb-safe">
        <div className="bg-white rounded-[20px] sm:rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-4 sm:p-7 md:p-8 lg:p-10 mx-auto max-w-[1220px]">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#71717B] mb-2">
                Итоги чемпионата
              </p>
              <h1 className="text-lg sm:text-xl md:text-[23px] font-semibold text-black">
                Результаты команд
              </h1>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[#71717B] mb-2">Результаты пока отсутствуют</p>
              <p className="text-sm text-[#71717B]">
                Заполните листы оценивания судей, чтобы увидеть рейтинг команд
              </p>
            </div>
          ) : (
            <div className="judge-table-wrap">
              <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
              <table className="w-full min-w-[480px] sm:min-w-0 border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="py-3 px-3 text-left text-sm font-semibold text-black">Место</th>
                    <th className="py-3 px-3 text-left text-sm font-semibold text-black">Команда</th>
                    <th className="py-3 px-3 text-left text-sm font-semibold text-black">Категория</th>
                    <th className="py-3 px-3 text-left text-sm font-semibold text-black">
                      Средний балл / 100
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((team) => (
                    <tr key={team.id} className="border-b border-[#E2E8F0] hover:bg-[#F9FAFB]">
                      <td className="py-2.5 px-3 text-sm font-semibold text-black">
                        {team.place}
                      </td>
                      <td className="py-2.5 px-3 text-sm text-black">{team.name}</td>
                      <td className="py-2.5 px-3 text-sm text-[#71717B]">{team.category}</td>
                      <td className="py-2.5 px-3 text-sm text-black">
                        {team.avgScore.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
