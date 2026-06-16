'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import JudgeHeader from '@/components/judge/JudgeHeader'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

export default function JudgeHome() {
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()
  const [stats, setStats] = useState({
    participants: 0,
    teams: 0,
    judges: 0,
    loading: true,
  })
  
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (user?.role !== 'judge') {
        router.push('/')
      } else {
        loadStats()
      }
    }
  }, [loading, isAuthenticated, user, router])

  const loadStats = async () => {
    try {
      const [participants, teams, judgeUsers] = await Promise.all([
        api.getJudgeParticipants(),
        api.getJudgeTeams(),
        api.getJudges(),
      ])
      
      setStats({
        participants: participants.length,
        teams: teams.length,
        judges: judgeUsers.length,
        loading: false,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      setStats({ participants: 0, teams: 0, judges: 0, loading: false })
    }
  }
  
  if (loading || stats.loading) {
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
      
      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 md:px-8 lg:px-16 xl:px-[114px] py-4 sm:py-8 md:py-10 pb-safe">
        <div className="bg-white rounded-[20px] sm:rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-4 sm:p-7 md:p-8 lg:p-10">
          <div className="flex flex-col md:flex-row justify-center gap-4 sm:gap-5 md:gap-6">
            <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 w-full md:w-[365px] flex flex-col">
              <h2 className="text-[14.5px] sm:text-[15px] md:text-[16px] font-semibold text-[#0F172A] mb-4 sm:mb-5 text-center">
                Участники
              </h2>
              <div className="flex-grow flex items-center justify-center mb-6 sm:mb-8">
                <p className="text-[28px] sm:text-[32px] md:text-[36px] font-semibold text-[#0F172A]">
                  {stats.participants}
                </p>
              </div>
              <div className="flex justify-center">
                <Link
                  href="/judge/participants"
                  className="flex min-h-[44px] touch-manipulation items-center justify-center gap-2 bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white rounded-[8px] px-4 py-2.5 text-[13px] font-semibold transition-colors group text-center whitespace-normal"
                >
                  <span>Перейти</span>
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

            <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 w-full md:w-[365px] flex flex-col">
              <h2 className="text-[14.5px] sm:text-[15px] md:text-[16px] font-semibold text-[#0F172A] mb-4 sm:mb-5 text-center">
                Судьи
              </h2>
              <div className="flex-grow flex items-center justify-center mb-6 sm:mb-8">
                <p className="text-[28px] sm:text-[32px] md:text-[36px] font-semibold text-[#0F172A]">
                  {stats.judges}
                </p>
              </div>
              <div className="flex justify-center">
                <Link
                  href="/judge/participants"
                  className="flex min-h-[44px] touch-manipulation items-center justify-center gap-2 bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white rounded-[8px] px-4 py-2.5 text-[13px] font-semibold transition-colors group text-center whitespace-normal"
                >
                  <span>Перейти</span>
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

            <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 w-full md:w-[365px] flex flex-col">
              <h2 className="text-[14.5px] sm:text-[15px] md:text-[16px] font-semibold text-[#0F172A] mb-4 sm:mb-5 text-center">
                Команды
              </h2>
              <div className="flex-grow flex items-center justify-center mb-6 sm:mb-8">
                <p className="text-[28px] sm:text-[32px] md:text-[36px] font-semibold text-[#0F172A]">
                  {stats.teams}
                </p>
              </div>
              <div className="flex justify-center">
                <Link
                  href="/judge/teams"
                  className="flex min-h-[44px] touch-manipulation items-center justify-center gap-2 bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white rounded-[8px] px-4 py-2.5 text-[13px] font-semibold transition-colors group text-center whitespace-normal"
                >
                  <span>Перейти</span>
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
        </div>
      </main>
    </div>
  )
}
