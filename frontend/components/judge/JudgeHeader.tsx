'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import JudgeNavigation from './JudgeNavigation'
import { useAuth } from '@/contexts/AuthContext'

function judgeHeaderDisplayName(fio?: string | null): string {
  const t = (fio ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return 'Судья'
  if (/^организатор\s+чемпионата$/i.test(t)) return 'Судья'
  return t
}

export default function JudgeHeader() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const handleLogout = () => {
    logout()
    router.push('/login')
  }
  
  return (
    <header className="w-full bg-white/95 backdrop-blur-sm shadow-[0_1px_0_0_rgba(15,23,42,0.06)] pt-safe">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 md:px-8 lg:px-16 xl:px-[134px] py-2.5 sm:py-4 md:py-5">
        <div className="mb-2 lg:mb-3">
          <h1 className="text-base leading-tight sm:text-xl md:text-2xl lg:text-[29.47px] font-semibold text-black text-center sm:text-left px-1 sm:px-0">
            Кабинет судьи
          </h1>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-3 w-full min-w-0">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden pr-1 lg:pr-2">
            <div className="hidden min-w-0 flex-1 lg:flex">
              <JudgeNavigation />
            </div>
            <Link href="/judge" className="flex-shrink-0 lg:hidden" aria-label="На главную кабинета">
              <img
                src="/logo.svg"
                alt=""
                width={200}
                height={64}
                className="h-11 w-auto max-h-11 max-w-[min(200px,55vw)] object-contain sm:h-14 sm:max-h-14"
              />
            </Link>
          </div>

          <div className="hidden shrink-0 items-center gap-2 lg:flex xl:gap-2.5">
            <div className="flex items-center gap-2 rounded-[23px] bg-white px-3 py-2 shadow-md xl:gap-3 xl:px-4 xl:py-2.5">
              <img
                src="/icons/user-icon.png"
                alt=""
                width={17}
                height={17}
                className="block w-4 h-4 xl:w-[17px] xl:h-[17px]"
                style={{ display: 'block' }}
              />
              <div className="flex flex-col">
                <span className="text-xs xl:text-[15.8px] font-semibold text-black">
                  {judgeHeaderDisplayName(user?.fio)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="bg-[#F1F5F9] rounded-[27px] shadow-md px-3 xl:px-5 py-2 xl:py-3 text-xs xl:text-[14.95px] font-semibold text-black hover:bg-[#0F172A] hover:text-white transition-colors"
            >
              Выйти
            </button>

            <Link href="/judge" className="flex shrink-0 items-center pl-0.5" aria-label="Chef a la Russe">
              <img
                src="/logo.svg"
                alt=""
                width={240}
                height={80}
                className="h-14 max-h-14 w-auto max-w-[160px] object-contain object-right"
                style={{ maxHeight: 56, maxWidth: 160 }}
              />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2.5 min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors flex-shrink-0 touch-manipulation"
            aria-label="Меню"
            aria-expanded={isMobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-6 pb-safe border-t border-gray-200 pt-4">
            <JudgeNavigation isMobile={true} onNavigate={() => setIsMobileMenuOpen(false)} />

            <div className="mt-4 space-y-3">
              <div className="bg-white rounded-[23px] shadow-md px-4 py-3 flex items-center gap-3">
                <img
                  src="/icons/user-icon.png"
                  alt="User"
                  width={17}
                  height={17}
                  className="block w-4 h-4"
                  style={{ display: 'block' }}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-black">{judgeHeaderDisplayName(user?.fio)}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full bg-[#F1F5F9] rounded-[27px] shadow-md px-4 py-3 text-sm font-semibold text-black hover:bg-[#0F172A] hover:text-white transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
