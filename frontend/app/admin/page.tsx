'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AdminHeader from '@/components/admin/AdminHeader'
import { useAuth } from '@/contexts/AuthContext'
import { api, User } from '@/lib/api'

const cardStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: 365,
  background: '#fff',
  borderRadius: 26,
  padding: '24px 28px 28px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
}

const btnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 44,
  width: '100%',
  background: '#F1F5F9',
  color: '#0F172A',
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'none',
}

type DashboardCard = {
  title: string
  value: number
  href: string
  icon: string
}

function DashboardCardBlock({ title, value, href, icon }: DashboardCard) {
  return (
    <div className="admin-card" style={cardStyle}>
      <div className="admin-card-blob admin-card-blob--lg" aria-hidden />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            height: 44,
            width: 44,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            background: '#F1F5F9',
          }}
        >
          <Image
            src={icon}
            alt=""
            width={24}
            height={24}
            className="admin-card-icon"
          />
        </div>
        <h2
          style={{
            margin: 0,
            textAlign: 'left',
            fontSize: 15,
            fontWeight: 600,
            color: '#64748B',
            lineHeight: 1.3,
          }}
        >
          {title}
        </h2>
      </div>
      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 88,
          marginBottom: 20,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 44,
            fontWeight: 700,
            color: '#0F172A',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            textAlign: 'center',
          }}
        >
          {value}
        </p>
      </div>
      <Link href={href} style={btnStyle} className="admin-dash-link">
        <span>Перейти</span>
        <span aria-hidden>›</span>
      </Link>
    </div>
  )
}

export default function AdminHome() {
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()
  const [stats, setStats] = useState({
    users: 0,
    participants: 0,
    judges: 0,
    admins: 0,
    teams: 0,
    loading: true,
  })

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (user?.role !== 'admin') {
        router.push('/')
      } else {
        loadStats()
      }
    }
  }, [loading, isAuthenticated, user, router])

  const loadStats = async () => {
    try {
      const [users, teams] = await Promise.all([
        api.getAllUsers().catch(() => []),
        api.getJudgeTeams().catch(() => []),
      ])

      const participants = (users || []).filter((u: User) => u.role === 'participant').length
      const judges = (users || []).filter((u: User) => u.role === 'judge').length
      const admins = (users || []).filter((u: User) => u.role === 'admin').length

      setStats({
        users: (users || []).length,
        participants,
        judges,
        admins,
        teams: (teams || []).length,
        loading: false,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      setStats({ users: 0, participants: 0, judges: 0, admins: 0, teams: 0, loading: false })
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

  const cards: DashboardCard[] = [
    {
      title: 'Всего пользователей',
      value: stats.users,
      href: '/admin/users',
      icon: '/icons/user-icon.png',
    },
    {
      title: 'Участники',
      value: stats.participants,
      href: '/admin/users?role=participant',
      icon: '/icons/participant-judge-icon.png',
    },
    {
      title: 'Судьи',
      value: stats.judges,
      href: '/admin/users?role=judge',
      icon: '/icons/trophy-icon.png',
    },
    {
      title: 'Администраторы',
      value: stats.admins,
      href: '/admin/users?role=admin',
      icon: '/icons/checkmark-icon.png',
    },
    {
      title: 'Команды',
      value: stats.teams,
      href: '/admin/teams',
      icon: '/icons/group-icon.png',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <AdminHeader />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[114px] py-6 sm:py-8 md:py-10">
        <div className="bg-white rounded-[20px] sm:rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-4 sm:p-7 md:p-8 lg:p-10">
          <div className="mb-6 sm:mb-8 text-left">
            <h1 className="text-xl sm:text-2xl font-semibold text-black">
              Панель управления
            </h1>
            <p className="mt-2 text-sm text-[#71717B]">
              Обзор системы и быстрый доступ к основным разделам
            </p>
          </div>

          <div className="admin-dash-row admin-dash-row--3">
            {cards.slice(0, 3).map((card) => (
              <DashboardCardBlock key={card.title} {...card} />
            ))}
          </div>
          <div className="admin-dash-row admin-dash-row--2">
            {cards.slice(3, 5).map((card) => (
              <DashboardCardBlock key={card.title} {...card} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
