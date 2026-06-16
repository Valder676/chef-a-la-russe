import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Регистрация',
  description: 'Регистрация участника чемпионата Chef a la Russe',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
