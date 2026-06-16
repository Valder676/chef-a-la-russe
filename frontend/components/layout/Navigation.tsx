'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { href: '/', label: 'Главная', icon: '/icons/trophy-icon.png' },
  { href: '/my-team', label: 'Моя команда', icon: '/icons/group-icon.png' },
  { href: '/uploads', label: 'Загрузки', icon: '/icons/upload-icon.png' },
  { href: '/results', label: 'Результаты', icon: '/icons/task-list-icon.png' },
]

interface NavigationProps {
  isMobile?: boolean
  onNavigate?: () => void
}

export default function Navigation({ isMobile = false, onNavigate }: NavigationProps) {
  const pathname = usePathname()

  const handleClick = () => {
    if (onNavigate) {
      onNavigate()
    }
  }

  if (isMobile) {
    return (
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href + '/')) ||
            (item.href === '/' && (pathname === '/' || pathname === ''))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-[20px] transition-colors ${
                isActive
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-[#F1F5F9] text-black'
              }`}
            >
            <img
              src={item.icon}
              alt={item.label}
              width={16}
              height={16}
              className={`block w-4 h-4 flex-shrink-0 brightness-0 ${isActive ? 'invert' : ''}`}
              style={{ 
                display: 'block',
                opacity: 1,
                width: '16px',
                height: '16px',
                visibility: 'visible',
                objectFit: 'contain'
              }}
              loading="eager"
            />
              <span className="text-sm font-semibold">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="flex gap-2 xl:gap-3 2xl:gap-4 items-center">
      {navItems.map((item) => {
        const isActive = pathname === item.href || 
          (item.href !== '/' && pathname.startsWith(item.href + '/')) ||
          (item.href === '/' && (pathname === '/' || pathname === ''))
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 xl:gap-3 px-3 xl:px-5 py-2 xl:py-3 rounded-[20px] transition-colors whitespace-nowrap group ${
              isActive
                ? 'bg-[#0F172A] text-white'
                : 'bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white'
            }`}
          >
            <img
              src={item.icon}
              alt={item.label}
              width={16}
              height={16}
              className={`block w-4 h-4 flex-shrink-0 brightness-0 transition-all ${isActive ? 'invert' : 'group-hover:invert'}`}
              style={{ 
                display: 'block',
                opacity: 1,
                width: '16px',
                height: '16px',
                visibility: 'visible',
                objectFit: 'contain'
              }}
              loading="eager"
            />
            <span className="text-xs xl:text-sm font-semibold">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

