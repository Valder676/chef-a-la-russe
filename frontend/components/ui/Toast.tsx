'use client'

export type ToastVariant = 'success' | 'error' | 'info'

interface AppToastProps {
  message: string
  variant?: ToastVariant
  onClose: () => void
}

export default function AppToast({ message, variant = 'info', onClose }: AppToastProps) {
  const styles =
    variant === 'success'
      ? 'bg-emerald-800 text-white'
      : variant === 'error'
        ? 'bg-red-700 text-white'
        : 'bg-[#0F172A] text-white'

  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 px-4 w-full max-w-md">
      <div
        className={`${styles} rounded-lg px-4 py-3 shadow-lg flex items-center justify-between gap-3 text-sm`}
        role="alert"
      >
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 opacity-80 hover:opacity-100 font-semibold"
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>
    </div>
  )
}
