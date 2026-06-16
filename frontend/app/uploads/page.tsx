'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api, Team, Upload, Document } from '@/lib/api'
import { activeStageDishCount } from '@backend/lib/dish-count'
import { useLoadSeq } from '@/lib/use-load-seq'
import AppToast, { type ToastVariant } from '@/components/ui/Toast'
import { ATTACH_BLOCKED_MESSAGE } from '@/lib/attach-messages'

export default function UploadsPage() {
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()
  const [team, setTeam] = useState<Team | null>(null)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const { nextSeq, isCurrent } = useLoadSeq()

  const showToast = (message: string, variant: ToastVariant = 'error') => {
    setToast({ message, variant })
  }

  const loadData = useCallback(async () => {
    const seq = nextSeq()
    setDataLoading(true)
    try {
      const [teamRes, uploadsRes, documentsRes] = await Promise.allSettled([
        api.getTeam(),
        api.getUploads(),
        api.getDocuments(),
      ])
      if (!isCurrent(seq)) return

      if (teamRes.status === 'fulfilled') {
        setTeam(teamRes.value)
      } else {
        console.error('Load team:', teamRes.reason)
      }

      if (uploadsRes.status === 'fulfilled') {
        setUploads(uploadsRes.value)
      } else {
        console.error('Load uploads:', uploadsRes.reason)
      }

      if (documentsRes.status === 'fulfilled') {
        setDocuments(documentsRes.value)
      } else {
        console.error('Load documents:', documentsRes.reason)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      if (isCurrent(seq)) setDataLoading(false)
    }
  }, [isCurrent, nextSeq])

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    loadData()
  }, [loading, isAuthenticated, router, loadData])

  const getFileDisplayName = (fileName: string) => {
    const parts = fileName.split('-')
    return parts.length > 1 ? parts.slice(1).join('-') : fileName
  }

  const handleDeleteUpload = async (uploadId: string) => {
    if (!confirm('Открепить этот файл? Его можно будет загрузить снова.')) return
    try {
      setDeletingId(uploadId)
      await api.deleteUpload(uploadId)
      await loadData()
    } catch (error: any) {
      alert(error.message || 'Не удалось открепить файл')
    } finally {
      setDeletingId(null)
    }
  }

  const getSlotUpload = (
    dishNumber: number,
    fileType: 'photo' | 'techCard' | 'menu'
  ) => uploads.find((u) => u.dishNumber === dishNumber && u.fileType === fileType)

  const handleFileUpload = async (
    dishNumber: number,
    fileType: 'photo' | 'techCard' | 'menu',
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (getSlotUpload(dishNumber, fileType)) {
      showToast(ATTACH_BLOCKED_MESSAGE)
      event.target.value = ''
      return
    }

    const slotKey = `${fileType}-${dishNumber}`
    if (uploadingSlot) return

    try {
      setUploadingSlot(slotKey)
      const created = await api.uploadFile(dishNumber, fileType, file)
      setUploads((prev) => {
        const rest = prev.filter(
          (u) =>
            !(
              u.dishNumber === dishNumber &&
              u.fileType === fileType
            )
        )
        return [created, ...rest]
      })
      await loadData()
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки файла')
    } finally {
      setUploadingSlot(null)
      event.target.value = ''
    }
  }

  const isSlotUploading = (dishNumber: number, fileType: string) =>
    uploadingSlot === `${fileType}-${dishNumber}`
  const isAnyUploading = uploadingSlot !== null

  const getUploadStatus = (dishNumber: number, fileType: 'photo' | 'techCard') => {
    return uploads.some((u) => u.dishNumber === dishNumber && u.fileType === fileType)
  }

  const getMenuUpload = () => uploads.find((u) => u.fileType === 'menu' && u.dishNumber === 0)
  const menuUpload = getMenuUpload()

  const dishCount = team ? activeStageDishCount(team) : 3
  const dishNumbers = Array.from({ length: dishCount }, (_, i) => i + 1)

  const dishes = dishNumbers.map((dishNum) => {
    const hasTechCard = getUploadStatus(dishNum, 'techCard')
    const hasPhoto = getUploadStatus(dishNum, 'photo')
    const filesCount = [hasTechCard, hasPhoto].filter(Boolean).length

    return {
      id: dishNum,
      name: `Блюдо ${dishNum}`,
      filesLabel: `ТК и фото: ${filesCount}/2`,
      hasPhoto,
      hasTechCard,
    }
  })

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-6 sm:py-8 md:py-10">
        <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 lg:p-10 mx-auto max-w-[1220px]">
          <div className="mb-4 sm:mb-6">
            <p className="text-[13.47px] font-medium text-[#71717B] mb-2">
              Материалы
            </p>
            <h1 className="text-[22.97px] sm:text-[23.33px] font-semibold text-black mb-2">
              Загрузки
            </h1>
            {!team && (
              <p className="text-sm text-[#92400e] bg-[#fffbeb] border border-[#fcd34d] rounded-lg px-4 py-3 mb-4">
                Файлы по блюдам привязаны к команде: загрузка доступна только после включения вас в состав команды
                организатором.
              </p>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="flex-1 flex">
              <div className="bg-white rounded-[26px] shadow-[0px_4px_17.8px_rgba(0,0,0,0.25)] p-6 sm:p-7 md:p-8 w-full h-full flex flex-col">
                <h2 className="text-[15.97px] font-semibold text-black mb-1">Блюда</h2>
                <p className="text-[12px] text-[#71717B] mb-4 sm:mb-6">
                  На каждое блюдо — один файл технологической карты (PDF/DOC) и одно фото.
                </p>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-5">
                  {dishes.map((dish) => {
                    const dishUploads = uploads.filter((u) => u.dishNumber === dish.id)
                    const techUpload = dishUploads.find((u) => u.fileType === 'techCard')
                    const photoUpload = dishUploads.find((u) => u.fileType === 'photo')

                    return (
                      <div
                        key={dish.id}
                        className="flex-1 border border-[#E9EEF4] rounded-[27px] p-5 sm:p-6 sm:min-w-[260px]"
                      >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[12.1px] font-medium text-[#71717B] mb-1">
                            {dish.name}
                          </p>
                          <h3 className="text-[15.97px] font-semibold text-black">
                            {dish.name}
                          </h3>
                        </div>
                        <div className="bg-[#F1F5F9] rounded-[12px] px-3 py-1.5" title="Один файл ТК и одно фото на блюдо">
                          <span className="text-[11px] sm:text-[12.4px] font-medium text-black">
                            {dish.filesLabel}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label
                          onClick={(e) => {
                            if (dish.hasTechCard) {
                              e.preventDefault()
                              showToast(ATTACH_BLOCKED_MESSAGE)
                            }
                          }}
                          className={`border border-[#E9EEF4] rounded-[19px] p-4 block transition-colors ${
                            isAnyUploading || !team
                              ? 'opacity-60 cursor-not-allowed'
                              : dish.hasTechCard
                                ? 'cursor-default'
                                : 'cursor-pointer hover:bg-[#F9FAFB]'
                          }`}
                        >
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="hidden"
                            disabled={isAnyUploading || !team || dish.hasTechCard}
                            onChange={(e) => handleFileUpload(dish.id, 'techCard', e)}
                          />
                          <div className="flex items-center gap-3 mb-2">
                            {dish.hasTechCard ? (
                              <div className="w-[26px] h-[26px] bg-[#D1FAE5] rounded flex items-center justify-center">
                                <img
                                  src="/icons/checkmark-icon.png"
                                  alt="Checkmark"
                                  width={10}
                                  height={10}
                                  className="w-[10px] h-[10px]"
                                />
                              </div>
                            ) : (
                              <div className="w-[26px] h-[26px] bg-[#F4F4F5] rounded flex items-center justify-center">
                                <div className="w-[10px] h-[10px] bg-[#9F9FA9] rounded"></div>
                              </div>
                            )}
                            <span className="text-[13.86px] font-semibold text-black">
                              ТК
                            </span>
                          </div>
                          <p className="text-[11.82px] font-medium text-[#72727D]">
                            {isSlotUploading(dish.id, 'techCard')
                              ? 'Загрузка…'
                              : dish.hasTechCard
                                ? 'Файл загружен (PDF/DOC)'
                                : 'PDF/DOC • нажмите, чтобы загрузить'}
                          </p>
                          {techUpload && (
                            <div className="mt-1 flex items-center gap-2 min-w-0">
                              <p className="text-[11px] font-medium text-[#0F172A] truncate flex-1 min-w-0">
                                {getFileDisplayName(techUpload.fileName)}
                              </p>
                              {team && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDeleteUpload(techUpload.id)
                                  }}
                                  disabled={deletingId === techUpload.id}
                                  className="shrink-0 text-[11px] font-semibold text-[#B91C1C] hover:underline disabled:opacity-50"
                                >
                                  {deletingId === techUpload.id ? '…' : 'Открепить'}
                                </button>
                              )}
                            </div>
                          )}
                        </label>

                        <label
                          onClick={(e) => {
                            if (dish.hasPhoto) {
                              e.preventDefault()
                              showToast(ATTACH_BLOCKED_MESSAGE)
                            }
                          }}
                          className={`border border-[#E9EEF4] rounded-[19px] p-4 block transition-colors ${
                            isAnyUploading || !team
                              ? 'opacity-60 cursor-not-allowed'
                              : dish.hasPhoto
                                ? 'cursor-default'
                                : 'cursor-pointer hover:bg-[#F9FAFB]'
                          }`}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isAnyUploading || !team || dish.hasPhoto}
                            onChange={(e) => handleFileUpload(dish.id, 'photo', e)}
                          />
                          <div className="flex items-center gap-3 mb-2">
                            {dish.hasPhoto ? (
                              <div className="w-[26px] h-[26px] bg-[#D1FAE5] rounded flex items-center justify-center">
                                <img
                                  src="/icons/checkmark-icon.png"
                                  alt="Checkmark"
                                  width={10}
                                  height={10}
                                  className="w-[10px] h-[10px]"
                                />
                              </div>
                            ) : (
                              <div className="w-[26px] h-[26px] bg-[#F4F4F5] rounded flex items-center justify-center">
                                <div className="w-[10px] h-[10px] bg-[#9F9FA9] rounded"></div>
                              </div>
                            )}
                            <span className="text-[13.86px] font-semibold text-black">
                              Фото
                            </span>
                          </div>
                          <p className="text-[11.82px] font-medium text-[#72727D]">
                            {isSlotUploading(dish.id, 'photo')
                              ? 'Загрузка…'
                              : dish.hasPhoto
                                ? 'Файл загружен (JPG/PNG)'
                                : 'JPG/PNG • нажмите, чтобы загрузить'}
                          </p>
                          {photoUpload && (
                            <div className="mt-1 flex items-center gap-2 min-w-0">
                              <p className="text-[11px] font-medium text-[#0F172A] truncate flex-1 min-w-0">
                                {getFileDisplayName(photoUpload.fileName)}
                              </p>
                              {team && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDeleteUpload(photoUpload.id)
                                  }}
                                  disabled={deletingId === photoUpload.id}
                                  className="shrink-0 text-[11px] font-semibold text-[#B91C1C] hover:underline disabled:opacity-50"
                                >
                                  {deletingId === photoUpload.id ? '…' : 'Открепить'}
                                </button>
                              )}
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            </div>

            <div className="flex-1 flex lg:max-w-[400px]">
              <div className="bg-white rounded-[26px] shadow-[0px_4px_17.8px_rgba(0,0,0,0.25)] p-6 sm:p-7 md:p-8 w-full h-full flex flex-col">
                <h2 className="text-[15px] sm:text-[15.19px] font-semibold text-black mb-6">
                  Документы
                </h2>

                <div className="border border-[#E9EEF4] rounded-[15px] p-5 sm:p-6 mb-4">
                  <p className="text-[13.83px] font-medium text-[#71717B] mb-2">
                    Меню
                  </p>
                  <p className="text-[12.77px] font-medium text-[#71717B] mb-4">
                    PDF/DOC • загрузите меню команды
                  </p>
                  {menuUpload && (
                    <div className="flex items-center gap-2 mb-3 min-w-0">
                      <p className="text-[12px] font-semibold text-[#0F172A] truncate flex-1 min-w-0">
                        {getFileDisplayName(menuUpload.fileName)}
                      </p>
                      {team && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUpload(menuUpload.id)}
                          disabled={deletingId === menuUpload.id}
                          className="shrink-0 text-[12px] font-semibold text-[#B91C1C] hover:underline disabled:opacity-50"
                        >
                          {deletingId === menuUpload.id ? '…' : 'Открепить'}
                        </button>
                      )}
                    </div>
                  )}
                  <label
                    onClick={(e) => {
                      if (menuUpload) {
                        e.preventDefault()
                        showToast(ATTACH_BLOCKED_MESSAGE)
                      }
                    }}
                    className={`flex items-center justify-center gap-3 bg-[#F1F5F9] text-black rounded-[6px] px-4 py-2.5 text-[13.67px] font-semibold transition-colors w-full group ${
                      isAnyUploading || !team
                        ? 'opacity-60 cursor-not-allowed'
                        : menuUpload
                          ? 'cursor-not-allowed opacity-70'
                          : 'cursor-pointer hover:bg-[#0F172A] hover:text-white'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      disabled={isAnyUploading || !team || !!menuUpload}
                      onChange={(e) => handleFileUpload(0, 'menu', e)}
                    />
                    <img
                      src="/icons/upload-icon.png"
                      alt=""
                      width={19}
                      height={19}
                      className="w-[19px] h-[19px] brightness-0 group-hover:invert transition-all"
                    />
                    <span>{isSlotUploading(0, 'menu') ? 'Загрузка…' : 'Загрузить меню'}</span>
                  </label>
                </div>

                <div className="border border-[#E9EEF4] rounded-[15px] p-5 sm:p-6 mb-4">
                  <p className="text-[13.83px] font-medium text-[#71717B] mb-2">
                    Личные документы
                  </p>
                  <div className="text-[22.67px] font-semibold text-black mb-4">
                    {documents.length}
                  </div>
                  <p className="text-[12.77px] font-medium text-[#71717B]">
                    Паспорт, медкнижка, согласия, допуски, справки — отдельным блоком.
                  </p>
                </div>

                <div className="flex justify-center">
                  <Link href="/uploads/documents">
                    <button className="flex items-center gap-3 bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white rounded-[6px] px-4 py-2.5 text-[13.67px] font-semibold transition-colors w-full sm:w-auto group">
                      <img
                        src="/icons/upload-icon.png"
                        alt="Upload"
                        width={19}
                        height={19}
                        className="w-[19px] h-[19px] brightness-0 group-hover:invert transition-all"
                      />
                      <span>Открыть документы</span>
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {toast && (
        <AppToast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
