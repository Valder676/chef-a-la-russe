'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api, Team } from '@/lib/api'

export default function MyTeamPage() {
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()
  const [team, setTeam] = useState<Team | null>(null)
  const [teamLoading, setTeamLoading] = useState(true)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    } else if (!loading && isAuthenticated) {
      loadTeam()
    }
  }, [loading, isAuthenticated, router])

  const loadTeam = async () => {
    try {
      const teamData = await api.getTeam()
      setTeam(teamData)
    } catch (error) {
      console.error('Error loading team:', error)
      setTeam(null)
    } finally {
      setTeamLoading(false)
    }
  }

  if (loading || teamLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-6 sm:py-8 md:py-10">
          <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 lg:p-10 mx-auto max-w-[1220px] text-center py-12">
            <p className="text-[#71717B] mb-4">Вы не состоите в команде</p>
            <p className="text-[13px] text-[#71717B]">Команды формируют судьи</p>
          </div>
        </main>
      </div>
    )
  }

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return 'Подтверждён'
      default:
        return 'На проверке'
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-6 sm:py-8 md:py-10">
        <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 lg:p-10 mx-auto max-w-[1220px]">
          <div className="mb-6">
            <div className="mb-3">
              <h1 className="text-[15.57px] font-medium text-[#71717C] mb-2">
                Команда
              </h1>
              <p className="text-[23.77px] font-semibold text-black">
                {team.name}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-[#0E172A] rounded-[21.5px] px-6 py-2">
                  <span className="text-[12.54px] font-semibold text-white">
                    {team.category}
                  </span>
                </div>
                <div className="bg-[#F1F5F9] rounded-[21.5px] px-6 py-2">
                  <span className="text-[12.9px] font-semibold text-black">
                    Сформирована судьями
                  </span>
                </div>
              </div>
              <Link
                href="/uploads"
                className="flex items-center gap-3 bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white rounded-[6px] px-4 py-2.5 text-[14.6px] font-semibold transition-colors group"
              >
                <img
                  src="/icons/upload-icon.png"
                  alt="Upload"
                  width={19}
                  height={19}
                  className="block w-[19px] h-[19px] brightness-0 group-hover:invert transition-all"
                  style={{ display: 'block' }}
                />
                <span>Загрузить материалы</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-[26px] shadow-[0px_4px_17.8px_rgba(0,0,0,0.25)] p-6 sm:p-7 md:p-8">
            <h2 className="text-[16.12px] font-semibold text-black mb-4">
              Состав
            </h2>
            
            {team.members && team.members.length > 0 ? (
              <div className="space-y-4 mb-6">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className="border border-[#E9EEF4] rounded-[18px] p-5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-[44px] h-[44px] bg-[#F4F4F5] rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src="/icons/user-icon.png"
                          alt={member.user.fio}
                          width={16}
                          height={16}
                          className="block object-contain"
                          style={{ display: 'block' }}
                        />
                      </div>
                      <div>
                        <p className="text-[16.23px] font-semibold text-black mb-1">
                          {member.user.fio}
                        </p>
                        <p className="text-[12.37px] font-medium text-[#A4A4AB]">
                          Участник
                        </p>
                      </div>
                    </div>
                    <div className="bg-[#F1F5F9] rounded-[11.5px] px-4 py-2">
                      <span className="text-[12.51px] font-semibold text-[#0E172A]">
                        {getStatusText(member.user?.status ?? member.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 mb-6">
                <p className="text-[#71717B]">Нет участников в команде</p>
              </div>
            )}

            <div className="bg-[#FAFAFA] border border-[#E9EDF4] rounded-[17px] p-4">
              <p className="text-[14.69px] font-medium text-[#52525D] text-center">
                Команды формируют судьи. Если состав неверный - сообщите судьям
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
