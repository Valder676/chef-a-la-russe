'use client'

export type AccountStatus = 'confirmed' | 'rejected' | 'pending' | string
export type SheetDisplayStatus = 'fixed' | 'in_progress' | 'not_started'

const badgeBase =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none tracking-wide whitespace-nowrap'

const variants: Record<string, string> = {
  confirmed:
    'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  pending: 'border-slate-200 bg-slate-100 text-slate-700',
  fixed: 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]',
  in_progress: 'border border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]',
  not_started: 'border-slate-200 bg-slate-50 text-slate-600',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  inactive: 'border-slate-200 bg-slate-100 text-slate-600',
  admin_confirmed: 'border-transparent bg-[#0F172A] text-white',
  admin_pending: 'border border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]',
  admin_rejected: 'border border-red-200 bg-red-50 text-red-800',
  in_system: 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]',
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.25}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  )
}

function DotIcon({ className }: { className?: string }) {
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80 ${className ?? ''}`} aria-hidden />
}

export function getAccountStatusVariant(status?: string): keyof typeof variants {
  if (status === 'confirmed') return 'confirmed'
  if (status === 'rejected') return 'rejected'
  return 'pending'
}

export function getAccountStatusLabel(status?: string): string {
  switch (status) {
    case 'confirmed':
      return 'Подтверждён'
    case 'rejected':
      return 'Отклонён'
    default:
      return 'На проверке'
  }
}

export function getSheetDisplayStatus(
  results: { status?: string }[],
  dishCount: number
): SheetDisplayStatus {
  if (!results.length) return 'not_started'
  const complete = results.length >= dishCount && dishCount > 0
  if (complete && results.every((r) => r.status === 'fixed')) return 'fixed'
  return 'in_progress'
}

export function getSheetStatusLabel(status: SheetDisplayStatus): string {
  switch (status) {
    case 'fixed':
      return 'Зафиксировано'
    case 'in_progress':
      return 'В работе'
    default:
      return 'Не начат'
  }
}

type StatusBadgeProps = {
  variant: keyof typeof variants | string
  label: string
  showLock?: boolean
  showDot?: boolean
  className?: string
}

export default function StatusBadge({
  variant,
  label,
  showLock = false,
  showDot = false,
  className = '',
}: StatusBadgeProps) {
  const styles = variants[variant] ?? variants.pending
  return (
    <span className={`${badgeBase} ${styles} ${className}`}>
      {showLock && <LockIcon className="opacity-90" />}
      {showDot && !showLock && <DotIcon />}
      {label}
    </span>
  )
}

function getAdminAccountVariant(status?: string): string {
  if (status === 'confirmed') return 'admin_confirmed'
  if (status === 'rejected') return 'admin_rejected'
  return 'admin_pending'
}

export function AccountStatusBadge({
  status,
  tone = 'default',
}: {
  status?: AccountStatus
  tone?: 'default' | 'admin'
}) {
  if (tone === 'admin') {
    const variant = getAdminAccountVariant(status)
    return (
      <StatusBadge
        variant={variant}
        label={getAccountStatusLabel(status)}
        showDot={variant === 'admin_pending'}
      />
    )
  }
  const variant = getAccountStatusVariant(status)
  return (
    <StatusBadge
      variant={variant}
      label={getAccountStatusLabel(status)}
      showDot={variant === 'pending'}
    />
  )
}

export function TeamStatusBadge({ status }: { status?: string }) {
  if (status === 'pending') {
    return <StatusBadge variant="admin_pending" label="На проверке" showDot />
  }
  return <StatusBadge variant="in_system" label="В системе" showDot />
}

export function SheetStatusBadge({
  results,
  dishCount,
}: {
  results: { status?: string }[]
  dishCount: number
}) {
  const sheetStatus = getSheetDisplayStatus(results, dishCount)
  return (
    <StatusBadge
      variant={sheetStatus}
      label={getSheetStatusLabel(sheetStatus)}
      showLock={sheetStatus === 'fixed'}
      showDot={sheetStatus === 'in_progress'}
    />
  )
}
