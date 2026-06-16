'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import JudgeHeader from '@/components/judge/JudgeHeader'
import { useAuth } from '@/contexts/AuthContext'
import { api, UploadWithUser } from '@/lib/api'
import { getToken } from '@/lib/api'
import AdminHeader from '@/components/admin/AdminHeader'
import { AccountStatusBadge } from '@/components/ui/StatusBadge'

interface DocumentWithUser {
  id: string
  name: string
  fileName: string
  fileSize: number
  status: string
  createdAt: string
  user: {
    id: string
    fio: string
    email: string
  }
}

interface JudgeTeamRow {
  id: string
  name: string
  members: Array<{
    id: string
    userId: string
    user: { id: string; fio: string; email: string }
  }>
}

const PREVIEWABLE_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
  'doc',
  'docx',
]

function extensionFromStoredName(storedName: string) {
  if (!storedName?.includes('.')) return ''
  return storedName.split('.').pop()?.toLowerCase() ?? ''
}

function displayUploadStoredName(storedName: string) {
  const parts = storedName.split('-')
  return parts.length > 1 ? parts.slice(1).join('-') : storedName
}

function DocumentsViewPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, loading, user } = useAuth()
  const [documents, setDocuments] = useState<DocumentWithUser[]>([])
  const [teams, setTeams] = useState<JudgeTeamRow[]>([])
  const [teamDishUploads, setTeamDishUploads] = useState<UploadWithUser[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState(() => searchParams.get('teamId') || '')
  const [selectedMemberId, setSelectedMemberId] = useState(() => {
    const t = searchParams.get('teamId')
    const u = searchParams.get('userId')
    return t && u ? u : ''
  })
  const [dataLoading, setDataLoading] = useState(true)
  const [batchDownloadingUploads, setBatchDownloadingUploads] = useState(false)
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null)

  const selectedTeam = teams.find((t) => t.id === selectedTeamId)

  const reloadTeamUploads = useCallback(async () => {
    if (!selectedTeamId) {
      setTeamDishUploads([])
      return
    }
    try {
      const items = await api.getTeamDishUploads(selectedTeamId)
      setTeamDishUploads(items)
    } catch (error) {
      console.error('Error loading team uploads:', error)
      setTeamDishUploads([])
    }
  }, [selectedTeamId])

  const teamUploadsFiltered = useMemo(() => {
    if (!selectedMemberId) return teamDishUploads
    return teamDishUploads.filter((u) => u.user.id === selectedMemberId)
  }, [teamDishUploads, selectedMemberId])

  const sortedTeamDishUploads = useMemo(() => {
    const typeOrder: Record<string, number> = { menu: 0, techCard: 1, photo: 2 }
    const list = [...teamUploadsFiltered]
    list.sort((a, b) => {
      if (a.dishNumber !== b.dishNumber) return a.dishNumber - b.dishNumber
      const ta = typeOrder[a.fileType] ?? 9
      const tb = typeOrder[b.fileType] ?? 9
      if (ta !== tb) return ta - tb
      const fa = displayUploadStoredName(a.fileName).toLowerCase()
      const fb = displayUploadStoredName(b.fileName).toLowerCase()
      const byFile = fa.localeCompare(fb, 'ru', { sensitivity: 'base' })
      if (byFile !== 0) return byFile
      return a.user.fio.localeCompare(b.user.fio, 'ru', { sensitivity: 'base' })
    })
    return list
  }, [teamUploadsFiltered])

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      const byUser = a.user.fio.localeCompare(b.user.fio, 'ru', { sensitivity: 'base' })
      if (byUser !== 0) return byUser
      const extA = extensionFromStoredName(a.fileName) || extensionFromStoredName(a.name)
      const extB = extensionFromStoredName(b.fileName) || extensionFromStoredName(b.name)
      const byExt = extA.localeCompare(extB, 'ru', { sensitivity: 'base' })
      if (byExt !== 0) return byExt
      const keyA = (a.fileName || a.name).toLowerCase()
      const keyB = (b.fileName || b.name).toLowerCase()
      const byKey = keyA.localeCompare(keyB, 'ru', { sensitivity: 'base' })
      if (byKey !== 0) return byKey
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [documents])

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (!['judge', 'admin'].includes(user?.role || '')) {
        router.push('/')
      } else {
        ;(async () => {
          try {
            const teamsData = await api.getJudgeTeams()
            setTeams(teamsData || [])
          } catch (error) {
            console.error('Error loading teams:', error)
            setTeams([])
          } finally {
            setDataLoading(false)
          }
        })()
      }
    }
  }, [loading, isAuthenticated, user, router])

  const refreshDocuments = useCallback(async () => {
    try {
      if (!selectedTeamId) {
        setDocuments([])
        return
      }
      const userId = selectedMemberId || undefined
      const docs = await api.getParticipantDocuments(userId, selectedTeamId)
      setDocuments(docs)
    } catch (error) {
      console.error('Error loading documents:', error)
      setDocuments([])
    }
  }, [selectedTeamId, selectedMemberId])

  useEffect(() => {
    if (loading || dataLoading) return
    refreshDocuments()
  }, [loading, dataLoading, refreshDocuments])

  useEffect(() => {
    reloadTeamUploads()
  }, [reloadTeamUploads])

  useEffect(() => {
    if (!teams.length || !selectedTeamId) return
    const exists = teams.some((t) => t.id === selectedTeamId)
    if (!exists) {
      setSelectedTeamId('')
      setSelectedMemberId('')
    }
  }, [teams, selectedTeamId])

  useEffect(() => {
    if (!selectedTeamId || !selectedMemberId || teams.length === 0) return
    const tm = teams.find((t) => t.id === selectedTeamId)
    const ok = tm?.members?.some((m) => m.user.id === selectedMemberId)
    if (!ok) setSelectedMemberId('')
  }, [teams, selectedTeamId, selectedMemberId])

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedTeamId) params.set('teamId', selectedTeamId)
    if (selectedMemberId) params.set('userId', selectedMemberId)
    const qs = params.toString()
    router.replace(qs ? `/judge/documents?${qs}` : '/judge/documents', { scroll: false })
  }, [selectedTeamId, selectedMemberId, router])

  const handleDetachTeamUpload = async (uploadId: string) => {
    if (!confirm('Открепить этот файл от команды? Его можно будет загрузить снова.')) return
    try {
      setDeletingUploadId(uploadId)
      await api.deleteUpload(uploadId)
      await reloadTeamUploads()
    } catch (error: any) {
      alert(error.message || 'Не удалось открепить файл')
    } finally {
      setDeletingUploadId(null)
    }
  }

  const handleUpdateStatus = async (docId: string, status: 'confirmed' | 'rejected' | 'pending') => {
    try {
      await api.updateDocumentStatus(docId, status)
      await refreshDocuments()
    } catch (error: any) {
      alert(error.message || 'Ошибка обновления статуса документа')
    }
  }

  const handleConfirm = async (docId: string) => {
    try {
      await api.updateDocumentStatus(docId, 'confirmed')
      await refreshDocuments()
    } catch (error: any) {
      alert(error.message || 'Ошибка подтверждения документа')
    }
  }

  const handleReject = async (docId: string) => {
    try {
      const doc = documents.find(d => d.id === docId)
      if (doc?.status === 'confirmed') {
        alert('Нельзя отклонить подтвержденный документ')
        return
      }
      const newStatus = doc?.status === 'rejected' ? 'pending' : 'rejected'
      await api.updateDocumentStatus(docId, newStatus)
      await refreshDocuments()
    } catch (error: any) {
      alert(error.message || 'Ошибка отклонения документа')
    }
  }

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить документ "${docName}"?`)) {
      return
    }

    try {
      await api.deleteDocument(docId)
      await refreshDocuments()
    } catch (error: any) {
      alert(error.message || 'Ошибка удаления документа')
    }
  }

  const handleBatchDownloadUploads = async () => {
    if (!selectedTeamId || sortedTeamDishUploads.length === 0) {
      alert('Нет файлов для скачивания')
      return
    }
    setBatchDownloadingUploads(true)
    try {
      const token = getToken()
      for (let i = 0; i < sortedTeamDishUploads.length; i++) {
        const u = sortedTeamDishUploads[i]
        const response = await fetch(`/api/uploads/${u.id}/download`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) continue
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const typeLabel = u.fileType === 'menu' ? 'Меню' : u.fileType === 'techCard' ? 'ТК' : 'Фото'
        a.download = `${u.user.fio}_${typeLabel}${u.fileType === 'menu' ? '' : `_блюдо${u.dishNumber}`}_${u.fileName}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        if (i < sortedTeamDishUploads.length - 1) await new Promise(r => setTimeout(r, 400))
      }
    } catch (error: any) {
      alert(error.message || 'Ошибка скачивания файлов')
    } finally {
      setBatchDownloadingUploads(false)
    }
  }

  const handleDownloadUpload = async (u: UploadWithUser) => {
    try {
      const token = getToken()
      const response = await fetch(`/api/uploads/${u.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = u.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      alert(error.message || 'Ошибка скачивания файла')
    }
  }

  const handleViewUpload = async (u: UploadWithUser) => {
    try {
      const token = getToken()
      const response = await fetch(`/api/uploads/${u.id}/view`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (error: any) {
      alert(error.message || 'Ошибка просмотра файла')
    }
  }

  const canPreviewUploadFile = (fileName: string) =>
    PREVIEWABLE_EXTENSIONS.includes(extensionFromStoredName(fileName))

  const canPreviewDocument = (doc: DocumentWithUser) =>
    PREVIEWABLE_EXTENSIONS.includes(
      extensionFromStoredName(doc.fileName) || extensionFromStoredName(doc.name)
    )

  const handleDownload = async (doc: DocumentWithUser) => {
    try {
      const token = getToken()
      const response = await fetch(`/api/documents/${doc.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Ошибка загрузки документа')
      }

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

  const handleView = async (doc: DocumentWithUser) => {
    try {
      const token = getToken()
      const response = await fetch(`/api/documents/${doc.id}/view`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Ошибка загрузки документа')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (error: any) {
      alert(error.message || 'Ошибка просмотра документа')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' Б'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ'
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated || !['judge', 'admin'].includes(user?.role || '')) {
    return null
  }

  const HeaderComponent = user?.role === 'admin' ? AdminHeader : JudgeHeader

  return (
    <div className="min-h-screen">
      <HeaderComponent />
      
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-6 sm:py-8 md:py-10">
        <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 lg:p-10">
          <div className="mb-6 pb-4 border-b border-[#E9EEF4]">
            <Link
              href={
                selectedTeamId
                  ? `/judge/teams/${selectedTeamId}`
                  : '/judge/teams'
              }
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {selectedTeamId
                ? selectedTeam
                  ? `К команде «${selectedTeam.name}»`
                  : 'К команде'
                : 'К списку команд'}
            </Link>
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-black">
              Документы участников
            </h1>
          </div>

          <div className="mb-6 flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-black mb-2">
                1. Команда
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => {
                  setSelectedTeamId(e.target.value)
                  setSelectedMemberId('')
                }}
                className="w-full max-w-xl px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent"
              >
                <option value="" disabled>
                  Выберите команду
                </option>
                {[...teams]
                  .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-black mb-2">
                2. Участник (все его загрузки)
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                disabled={!selectedTeamId}
                className="w-full max-w-xl px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {selectedTeamId ? 'Все участники команды' : 'Сначала выберите команду'}
                </option>
                {[...(selectedTeam?.members ?? [])]
                  .sort((a, b) =>
                    a.user.fio.localeCompare(b.user.fio, 'ru', { sensitivity: 'base' })
                  )
                  .map((m) => (
                  <option key={m.id} value={m.user.id}>
                    {m.user.fio} ({m.user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedTeamId && (
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-black">Командные материалы</h2>
                </div>
                {sortedTeamDishUploads.length > 0 && (
                  <button
                    onClick={handleBatchDownloadUploads}
                    disabled={batchDownloadingUploads}
                    className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white disabled:opacity-50 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shrink-0"
                  >
                    {batchDownloadingUploads ? 'Скачивание...' : 'Скачать все файлы'}
                  </button>
                )}
              </div>

              {sortedTeamDishUploads.length === 0 ? (
                <div className="text-center py-8 border border-[#E9EEF4] rounded-[16px]">
                  <p className="text-sm text-[#71717B]">Командных файлов пока нет</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedTeamDishUploads.map((u) => (
                    <div
                      key={u.id}
                      className="border border-[#E9EEF4] rounded-[16px] p-4 sm:p-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-black truncate">
                            {u.fileType === 'menu'
                              ? 'Меню'
                              : u.fileType === 'techCard'
                                ? `Блюдо ${u.dishNumber} · ТК`
                                : `Блюдо ${u.dishNumber} · Фото`}
                          </p>
                          <p className="text-xs text-[#71717B] mt-1 truncate">
                            {displayUploadStoredName(u.fileName)}
                          </p>
                          <p className="text-xs text-[#71717B] mt-1">
                            Загрузил: <span className="font-medium text-[#475569]">{u.user.fio}</span>
                          </p>
                          <p className="text-xs text-[#71717B] mt-0.5">
                            {formatFileSize(u.fileSize)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {canPreviewUploadFile(u.fileName) && (
                            <button
                              onClick={() => handleViewUpload(u)}
                              className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-2 rounded-md text-xs font-semibold transition-colors"
                            >
                              Просмотр
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadUpload(u)}
                            className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-2 rounded-md text-xs font-semibold transition-colors"
                          >
                            Скачать
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDetachTeamUpload(u.id)}
                            disabled={deletingUploadId === u.id}
                            className="text-[#B91C1C] hover:underline px-3 py-2 rounded-md text-xs font-semibold disabled:opacity-50"
                          >
                            {deletingUploadId === u.id ? '…' : 'Открепить'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <h2 className="text-lg font-semibold text-black">Файлы из раздела «Документы»</h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {!selectedTeamId ? null : documents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-[#71717B]">Документы не найдены</p>
              </div>
            ) : (
              sortedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-[#E9EEF4] rounded-[16.36px] p-4 sm:p-5 md:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div className="w-[36px] h-[36px] sm:w-[44px] sm:h-[44px] bg-[#F1F5F9] rounded flex items-center justify-center flex-shrink-0">
                        <img
                          src="/icons/upload-icon.png"
                          alt="Document"
                          width={20}
                          height={20}
                          className="w-4 h-4 sm:w-5 sm:h-5 brightness-0"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base md:text-[15.36px] font-medium text-black mb-1 truncate">
                          {doc.name}
                        </p>
                        <p className="text-[11px] text-[#94a3b8] mb-1 truncate" title={doc.fileName}>
                          {displayUploadStoredName(doc.fileName)}
                        </p>
                        <p className="text-xs sm:text-sm md:text-[13.09px] font-medium text-[#71717B] mb-2">
                          Участник: <span className="font-semibold">{doc.user.fio}</span> ({doc.user.email})
                        </p>
                        <p className="text-xs sm:text-sm md:text-[13.09px] font-medium text-[#71717B] mb-2">
                          {formatFileSize(doc.fileSize)} • {formatDate(doc.createdAt)}
                        </p>
                        <AccountStatusBadge status={doc.status} />
                      </div>
                    </div>
                    <div className="w-full sm:w-auto sm:min-w-[450px]">
                      <div className="grid grid-cols-3 gap-2">
                        {canPreviewDocument(doc) ? (
                          <button
                            onClick={() => handleView(doc)}
                            className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black h-10 px-3 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Просмотр</span>
                          </button>
                        ) : (
                          <div />
                        )}
                        <button
                          onClick={() => handleDownload(doc)}
                          className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black h-10 px-3 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Скачать</span>
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.name)}
                          className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black h-10 px-3 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Удалить</span>
                        </button>

                        {doc.status !== 'confirmed' ? (
                          <button
                            onClick={() => handleConfirm(doc.id)}
                            className="bg-[#0F172A] hover:bg-[#1e293b] text-white h-10 px-3 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Подтвердить</span>
                          </button>
                        ) : (
                          <div />
                        )}

                        {doc.status !== 'confirmed' && doc.status !== 'rejected' ? (
                          <button
                            onClick={() => handleReject(doc.id)}
                            className="bg-[#71717B] hover:bg-[#52525b] text-white h-10 px-3 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Отклонить</span>
                          </button>
                        ) : doc.status === 'rejected' ? (
                          <button
                            onClick={() => handleUpdateStatus(doc.id, 'pending')}
                            className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black h-10 px-3 rounded-md text-sm font-semibold transition-colors flex items-center justify-center"
                          >
                            <span>Сбросить</span>
                          </button>
                        ) : (
                          <div />
                        )}
                        <div />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DocumentsViewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <p>Загрузка...</p>
        </div>
      }
    >
      <DocumentsViewPageContent />
    </Suspense>
  )
}
