import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Кабинет судьи - Цифровая система оценивания кулинарного чемпионата "Chef a la Russe"',
  description: 'Цифровая система оценивания кулинарного чемпионата "Chef a la Russe" - Кабинет судьи',
}

export default function JudgeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
