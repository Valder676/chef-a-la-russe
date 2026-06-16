'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api, Document } from '@/lib/api'
import { getToken } from '@/lib/api'
import { useLoadSeq } from '@/lib/use-load-seq'
import AppToast, { type ToastVariant } from '@/components/ui/Toast'
import { ATTACH_BLOCKED_DOCUMENT_MESSAGE } from '@/lib/attach-messages'

type RequiredDoc = {
  type: 'passport' | 'medbook'
  title: string
  hint: string
}

const REQUIRED_DOCS: RequiredDoc[] = [
  { type: 'passport', title: 'Паспорт', hint: 'Разворот с фото и данными' },
  { type: 'medbook', title: 'Медицинская книжка', hint: 'Актуальная медкнижка участника' },
]

export default function DocumentsPage() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const { nextSeq, isCurrent } = useLoadSeq()

  const loadDocuments = useCallback(async () => {
    const seq = nextSeq()
    setDataLoading(true)
    try {
      const docs = await api.getDocuments()
      if (!isCurrent(seq)) return
      setDocuments(docs)
    } catch (error) {
      console.error('Error loading documents:', error)
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
    loadDocuments()
  }, [loading, isAuthenticated, router, loadDocuments])

  const showToast = (message: string, variant: ToastVariant = 'error') => {
    setToast({ message, variant })
  }

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    documentType: RequiredDoc['type']
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (docsByType[documentType]) {
      showToast(ATTACH_BLOCKED_DOCUMENT_MESSAGE)
      e.target.value = ''
      return
    }

    setUploadingType(documentType)
    try {
      await api.uploadDocument(file, documentType)
      await loadDocuments()
      if (inputRefs.current[documentType]) inputRefs.current[documentType]!.value = ''
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки документа')
    } finally {
      setUploadingType(null)
    }
  }

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить документ "${docName}"?`)) return
    try {
      await api.deleteDocument(docId)
      await loadDocuments()
    } catch (error: any) {
      alert(error.message || 'Ошибка удаления документа')
    }
  }

  const handleDownload = async (doc: Document) => {
    try {
      const token = getToken()
      const response = await fetch(`/api/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Ошибка загрузки документа')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      alert(error.message || 'Ошибка скачивания документа')
    }
  }

  const handleView = async (doc: Document) => {
    try {
      const token = getToken()
      const response = await fetch(`/api/documents/${doc.id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Ошибка загрузки документа')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (error: any) {
      alert(error.message || 'Ошибка просмотра документа')
    }
  }

  const docsByType = useMemo(() => {
    const map: Record<string, Document | undefined> = {}
    for (const item of REQUIRED_DOCS) {
      map[item.type] = documents.find((d) => d.name.startsWith(`${item.title}: `))
    }
    return map
  }, [documents])

  const canPreview = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif'].includes(ext || '')
  }
  const formatFileSize = (bytes: number) =>
    bytes < 1024 ? `${bytes} Б` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} КБ` : `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  const getStatusColor = (status: string) =>
    status === 'confirmed' ? 'bg-[#0F172A] text-white' : status === 'rejected' ? 'bg-[#71717B] text-white' : 'bg-[#E2E8F0] text-[#0F172A]'
  const getStatusText = (status: string) =>
    status === 'confirmed' ? 'Подтвержден' : status === 'rejected' ? 'Отклонен' : 'На проверке'

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }
  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-6 sm:py-8 md:py-10">
        <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 lg:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-4 sm:mb-5 md:mb-6">
            <div>
              <p className="text-xs sm:text-[13.47px] font-medium text-[#71717B] mb-2">Материалы</p>
              <h1 className="text-lg sm:text-xl md:text-[23.33px] font-semibold text-black">Личные документы</h1>
            </div>
            <Link href="/uploads">
              <Button variant="secondary" className="flex items-center gap-2 w-full sm:w-auto">
                <span>Назад</span>
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-[26px] shadow-[0px_4px_17.8px_rgba(0,0,0,0.25)] p-6 sm:p-7 md:p-8 w-full flex flex-col">
            <div className="mb-4 sm:mb-5 md:mb-6">
              <h2 className="text-sm sm:text-base md:text-[15.19px] font-semibold text-black">Отдельные слоты документов</h2>
              <p className="text-xs sm:text-sm text-[#71717B] mt-1">
                Каждый документ загружается в свой слот. Чтобы загрузить другой файл, сначала удалите текущий.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4 flex-1">
              {REQUIRED_DOCS.map((item) => {
                const doc = docsByType[item.type]
                const cleanName = doc ? doc.name.replace(`${item.title}: `, '') : ''
                return (
                  <div key={item.type} className="border border-[#E9EEF4] rounded-[16.36px] p-4 sm:p-5 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1">
                        <div className="w-[36px] h-[36px] sm:w-[44px] sm:h-[44px] bg-[#F1F5F9] rounded flex items-center justify-center flex-shrink-0">
                          <img src="/icons/upload-icon.png" alt="" width={20} height={20} className="w-4 h-4 sm:w-5 sm:h-5 brightness-0" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm sm:text-base md:text-[15.36px] font-semibold text-black mb-1">{item.title}</p>
                          <p className="text-xs sm:text-sm text-[#71717B] mb-2">{item.hint}</p>
                          {!doc ? (
                            <p className="text-xs sm:text-sm text-[#71717B]">Файл не загружен</p>
                          ) : (
                            <>
                              <p className="text-xs sm:text-sm md:text-[13.09px] font-medium text-[#71717B] mb-2">
                                {cleanName} • {formatFileSize(doc.fileSize)} • {formatDate(doc.createdAt)}
                              </p>
                              <div className={`rounded-[12.5px] px-2 sm:px-3 py-1.5 sm:py-2 inline-block ${getStatusColor(doc.status)}`}>
                                <span className="text-[10px] sm:text-[11.78px] font-medium">{getStatusText(doc.status)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <input
                          ref={(el) => {
                            inputRefs.current[item.type] = el
                          }}
                          type="file"
                          onChange={(e) => handleFileSelect(e, item.type)}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                        {!doc ? (
                          <button
                            type="button"
                            onClick={() => inputRefs.current[item.type]?.click()}
                            disabled={uploadingType === item.type}
                            className="bg-[#F1F5F9] text-black hover:bg-[#0F172A] hover:text-white px-3 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
                          >
                            {uploadingType === item.type ? 'Загрузка...' : 'Загрузить'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => showToast(ATTACH_BLOCKED_DOCUMENT_MESSAGE)}
                            className="bg-[#F1F5F9] text-black px-3 py-2 rounded-md text-xs sm:text-sm font-semibold opacity-60 cursor-not-allowed"
                          >
                            Загрузить
                          </button>
                        )}
                        {doc && canPreview(doc.name) && (
                          <button onClick={() => handleView(doc)} className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors">
                            Просмотр
                          </button>
                        )}
                        {doc && (
                          <button onClick={() => handleDownload(doc)} className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors">
                            Скачать
                          </button>
                        )}
                        {doc && (
                          <button onClick={() => handleDelete(doc.id, item.title)} className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors">
                            Удалить
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
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
