'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getToken, ViolationPhoto } from '@/lib/api'
import {
  dishPhotoKey,
  MAX_VIOLATION_PHOTOS_PER_DISH,
  ViolationCriterionKey,
} from '@/lib/violation-photos'

const PREVIEW_W = 176
const PREVIEW_H = 132
const CARD_ACTIONS_H = 37
const CARD_TOTAL_H = PREVIEW_H + CARD_ACTIONS_H

function buildDishGridColumns(photoCount: number, canAddMore: boolean): string {
  if (photoCount === 0 && canAddMore) return 'minmax(0, 1fr)'
  const photoCols = Array.from(
    { length: photoCount },
    () => `minmax(88px, 1fr)`
  )
  if (!canAddMore) return photoCols.join(' ')
  const addShare = Math.max(1, MAX_VIOLATION_PHOTOS_PER_DISH - photoCount)
  return [...photoCols, `minmax(72px, ${addShare}fr)`].join(' ')
}

function ViolationPhotoCard({
  photo,
  canDelete,
  deleting,
  onOpen,
  onDelete,
}: {
  photo: ViolationPhoto
  canDelete: boolean
  deleting: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const load = async (attempt: number) => {
      setLoading(true)
      setLoadError(null)
      try {
        const url = `/api/judge/violation-photos/view?id=${encodeURIComponent(photo.id)}${
          attempt > 0 ? `&_=${Date.now()}` : ''
        }`
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${getToken()}` },
          signal: controller.signal,
          cache: 'no-store',
        })

        const contentType = response.headers.get('content-type') ?? ''
        if (!response.ok || contentType.includes('application/json')) {
          throw new Error(response.status === 404 ? 'file-missing' : 'http-error')
        }

        const blob = await response.blob()
        if (!blob.size) throw new Error('empty')

        const previewUrl = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(previewUrl)
          return
        }

        setSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return previewUrl
        })
      } catch (err) {
        if (cancelled) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (attempt === 0) {
          void load(1)
          return
        }
        setSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
        setLoadError(
          err instanceof Error && err.message === 'file-missing'
            ? 'Файл не найден'
            : 'Не удалось загрузить'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(0)

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [photo.id])

  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src)
    }
  }, [src])

  return (
    <div
      className="flex min-w-0 w-full max-w-[176px] flex-col overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-white shadow-sm justify-self-start"
      style={{ height: CARD_TOTAL_H }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="relative block w-full shrink-0 overflow-hidden bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F172A]/25"
        style={{ height: PREVIEW_H, minHeight: PREVIEW_H }}
        aria-label="Открыть фото"
      >
        {loading ? (
          <span className="flex h-full w-full items-center justify-center">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#0F172A]" />
          </span>
        ) : src ? (
          <img
            src={src}
            alt=""
            className="block h-full w-full object-cover"
            draggable={false}
            onError={() => {
              setSrc((prev) => {
                if (prev) URL.revokeObjectURL(prev)
                return null
              })
              setLoadError('Ошибка отображения')
            }}
          />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-[10px] leading-tight text-[#94A3B8]">
            <span>{loadError ?? 'Нет превью'}</span>
            <span
              role="button"
              tabIndex={0}
              className="text-[#0F172A] underline cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                void onOpen()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  void onOpen()
                }
              }}
            >
              Открыть файл
            </span>
          </span>
        )}
      </button>

      <div
        className="flex shrink-0 border-t border-[#E9EEF4]"
        style={{ height: CARD_ACTIONS_H, minHeight: CARD_ACTIONS_H }}
      >
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 py-2 text-[11px] font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors touch-manipulation"
        >
          Открыть
        </button>
        {canDelete && (
          <>
            <div className="w-px bg-[#E9EEF4]" aria-hidden />
            <button
              type="button"
              disabled={deleting}
              onClick={onDelete}
              className="flex-1 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 touch-manipulation"
            >
              {deleting ? '…' : 'Удалить'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function AddPhotoStrip({
  isUploading,
  onClick,
  matchPhotoHeight,
}: {
  isUploading: boolean
  onClick: () => void
  matchPhotoHeight?: boolean
}) {
  return (
    <button
      type="button"
      disabled={isUploading}
      onClick={onClick}
      aria-label="Добавить фото нарушения"
      className="flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] text-left transition-colors hover:bg-[#F1F5F9] active:bg-[#E9EEF4] disabled:pointer-events-none disabled:opacity-50 touch-manipulation"
      style={{ minHeight: matchPhotoHeight ? CARD_TOTAL_H : 48 }}
    >
      <span className="w-1 shrink-0 self-stretch bg-[#CBD5E1]" aria-hidden />
      <span className="flex flex-1 items-center justify-center px-4 py-3.5 text-sm font-semibold text-[#334155] whitespace-nowrap">
        {isUploading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#CBD5E1] border-t-[#0F172A]" />
        ) : (
          'Добавить'
        )}
      </span>
    </button>
  )
}

async function openPhotoInNewTab(photoId: string) {
  try {
    const response = await fetch(
      `/api/judge/violation-photos/view?id=${encodeURIComponent(photoId)}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
        cache: 'no-store',
      }
    )
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || contentType.includes('application/json')) return
    const blob = await response.blob()
    if (!blob.size) return
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch {}
}

interface ViolationPhotosSectionProps {
  criterionKey: ViolationCriterionKey
  dishNumbers: number[]
  photosIndex: Record<string, ViolationPhoto[]>
  canEdit: boolean
  isFixed: boolean
  uploadingKey: string | null
  onUpload: (dishNumber: number, file: File) => Promise<void>
  onDelete: (photoId: string) => Promise<void>
}

export default function ViolationPhotosSection({
  criterionKey,
  dishNumbers,
  photosIndex,
  canEdit,
  isFixed,
  uploadingKey,
  onUpload,
  onDelete,
}: ViolationPhotosSectionProps) {
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const pickFile = useCallback((dishNumber: number) => {
    fileInputRefs.current[dishNumber]?.click()
  }, [])

  const handleFileChange = useCallback(
    async (dishNumber: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      const currentCount =
        photosIndex[dishPhotoKey(criterionKey, dishNumber)]?.length ?? 0
      if (currentCount >= MAX_VIOLATION_PHOTOS_PER_DISH) {
        alert(`Можно прикрепить не более ${MAX_VIOLATION_PHOTOS_PER_DISH} фото на блюдо`)
        return
      }
      if (!file.type.startsWith('image/')) {
        alert('Можно загружать только изображения (JPG, PNG)')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой (максимум 10 МБ)')
        return
      }
      await onUpload(dishNumber, file)
    },
    [criterionKey, onUpload, photosIndex]
  )

  const handleDelete = useCallback(
    async (photoId: string) => {
      if (isFixed) {
        alert('Лист зафиксирован. Разблокируйте лист, чтобы удалить фото.')
        return
      }
      if (!canEdit) return
      if (!confirm('Удалить это фото?')) return
      setDeletingId(photoId)
      try {
        await onDelete(photoId)
      } finally {
        setDeletingId(null)
      }
    },
    [canEdit, isFixed, onDelete]
  )

  const canModify = canEdit && !isFixed
  const canDeletePhotos = canModify

  const renderFileInput = (dishNumber: number) => (
    <input
      ref={(el) => {
        fileInputRefs.current[dishNumber] = el
      }}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
      className="hidden"
      onChange={(e) => void handleFileChange(dishNumber, e)}
    />
  )

  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-black">Фото нарушений</span>
        <span className="text-xs text-[#94A3B8]">
          JPG, PNG · до {MAX_VIOLATION_PHOTOS_PER_DISH} на блюдо
        </span>
      </div>

      {isFixed && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs leading-relaxed text-emerald-900">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p>
            <span className="font-semibold">Лист зафиксирован</span> — добавление и удаление фото недоступны.
            Разблокируйте лист для изменений.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {dishNumbers.map((dishNumber) => {
          const photos = photosIndex[dishPhotoKey(criterionKey, dishNumber)] ?? []
          const uploadKey = `${criterionKey}-${dishNumber}`
          const isUploading = uploadingKey === uploadKey
          const count = photos.length
          const hasPhotos = count > 0
          const canAddMore = canModify && count < MAX_VIOLATION_PHOTOS_PER_DISH
          const atLimit = count >= MAX_VIOLATION_PHOTOS_PER_DISH

          return (
            <div
              key={dishNumber}
              className="rounded-[12px] border border-[#E9EEF4] bg-[#FAFBFC] p-3 sm:p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#334155]">Блюдо {dishNumber}</span>
                {(hasPhotos || canModify) && (
                  <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#64748B] tabular-nums">
                    {count} / {MAX_VIOLATION_PHOTOS_PER_DISH}
                  </span>
                )}
              </div>

              {!hasPhotos && !canModify && (
                <p className="text-xs text-[#94A3B8]">Нет прикреплённых фото</p>
              )}

              {atLimit && canModify && (
                <p className="mb-2 text-xs text-[#64748B]">
                  Достигнут лимит — {MAX_VIOLATION_PHOTOS_PER_DISH} фото на блюдо
                </p>
              )}

              {(hasPhotos || canAddMore) && (
                <div
                  className="grid w-full min-w-0 items-stretch gap-2 sm:gap-3"
                  style={{
                    gridTemplateColumns: buildDishGridColumns(count, canAddMore),
                  }}
                >
                  {photos.map((photo) => (
                    <ViolationPhotoCard
                      key={photo.id}
                      photo={photo}
                      canDelete={canDeletePhotos}
                      deleting={deletingId === photo.id}
                      onOpen={() => void openPhotoInNewTab(photo.id)}
                      onDelete={() => void handleDelete(photo.id)}
                    />
                  ))}
                  {canAddMore && (
                    <>
                      {renderFileInput(dishNumber)}
                      <AddPhotoStrip
                        isUploading={isUploading}
                        onClick={() => pickFile(dishNumber)}
                        matchPhotoHeight={hasPhotos}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type { ViolationCriterionKey }
