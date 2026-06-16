import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Вход',
  description: 'Вход в личный кабинет участника чемпионата Chef a la Russe',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
