'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AdminHeader from '@/components/admin/AdminHeader'
import { useAuth } from '@/contexts/AuthContext'
import { api, User } from '@/lib/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function AdminUsersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterRole = searchParams.get('role')
  const { isAuthenticated, loading, user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fio: '',
    phone: '',
    city: '',
    organization: '',
    role: 'participant' as 'participant' | 'judge' | 'admin',
    status: 'pending' as 'pending' | 'confirmed',
  })
  
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (user?.role !== 'admin') {
        router.push('/')
      } else {
        loadUsers()
      }
    }
  }, [loading, isAuthenticated, user, router])

  const loadUsers = async () => {
    try {
      const allUsers = await api.getAllUsers()
      const filtered = filterRole 
        ? allUsers.filter(u => u.role === filterRole)
        : allUsers
      setUsers(filtered)
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])
    } finally {
      setDataLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      await api.createUser(formData)
      setShowCreateModal(false)
      resetForm()
      loadUsers()
    } catch (error: any) {
      alert(error.message || 'Ошибка создания пользователя')
    }
  }

  const handleUpdate = async () => {
    if (!editingUser) return
    try {
      await api.updateUser(editingUser.id, formData)
      setEditingUser(null)
      resetForm()
      loadUsers()
    } catch (error: any) {
      alert(error.message || 'Ошибка обновления пользователя')
    }
  }

  const handleDelete = async (userId: string, userFio: string) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${userFio}"?`)) {
      return
    }
    try {
      await api.deleteUser(userId)
      loadUsers()
    } catch (error: any) {
      alert(error.message || 'Ошибка удаления пользователя')
    }
  }

  const handleConfirmUser = async (userId: string) => {
    try {
      await api.updateUser(userId, { status: 'confirmed' })
      loadUsers()
    } catch (error: any) {
      alert(error.message || 'Ошибка подтверждения пользователя')
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      fio: '',
      phone: '',
      city: '',
      organization: '',
      role: 'participant',
      status: 'pending',
    })
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: '',
      fio: user.fio,
      phone: user.phone || '',
      city: user.city || '',
      organization: user.organization || '',
      role: user.role as any,
      status: user.status as any,
    })
  }

  const getRoleColor = (role: string) => {
    return 'bg-[#0F172A] text-white'
  }

  const getStatusColor = (status: string) => {
    return status === 'confirmed' 
      ? 'bg-[#0F172A] text-white'
      : 'bg-[#71717B] text-white'
  }
  
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }
  
  if (!isAuthenticated || user?.role !== 'admin') {
    return null
  }
  
  return (
    <div className="min-h-screen bg-white">
      <AdminHeader />
      
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-6 sm:py-8 md:py-10">
        <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 lg:p-10">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-lg sm:text-xl md:text-[23px] font-semibold text-black mb-2">
                Управление пользователями
              </h1>
              {filterRole && (
                <p className="text-sm text-[#71717B]">
                  Фильтр: {filterRole === 'participant' ? 'Участники' : filterRole === 'judge' ? 'Судьи' : 'Администраторы'}
                </p>
              )}
            </div>
            <Button
              onClick={() => {
                resetForm()
                setEditingUser(null)
                setShowCreateModal(true)
              }}
              className="flex items-center gap-2"
            >
              <span>+ Создать пользователя</span>
            </Button>
          </div>

          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#71717B]">Пользователи не найдены</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#E9EEF4]">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-black">ФИО</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-black">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-black">Роль</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-black">Статус</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-black">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="border-b border-[#E9EEF4] hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{userItem.fio}</td>
                        <td className="py-3 px-4 text-sm">{userItem.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getRoleColor(userItem.role)}`}>
                            {userItem.role === 'participant' ? 'Участник' : 
                             userItem.role === 'judge' ? 'Судья' :
                             userItem.role === 'admin' ? 'Админ' : userItem.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(userItem.status)}`}>
                            {userItem.status === 'confirmed' ? 'Подтверждён' : 'На проверке'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 flex-wrap">
                            {userItem.status === 'pending' && (
                              <button
                                onClick={() => handleConfirmUser(userItem.id)}
                                className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Подтвердить
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(userItem)}
                              className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Редактировать
                            </button>
                            {userItem.id !== user?.id && (
                              <button
                                onClick={() => handleDelete(userItem.id, userItem.fio)}
                                className="bg-[#F1F5F9] hover:bg-[#0F172A] hover:text-white text-black px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Удалить
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {(showCreateModal || editingUser) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] max-w-[650px] w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#F1F5F9] px-6 sm:px-8 py-5 border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0F172A] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {editingUser ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-black">
                      {editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#71717B] mt-1">
                      {editingUser ? 'Измените данные пользователя' : 'Заполните форму для создания нового пользователя'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingUser(null)
                    resetForm()
                  }}
                  className="w-8 h-8 rounded-full bg-white hover:bg-[#0F172A] hover:text-white flex items-center justify-center transition-colors border border-[#E2E8F0]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-black mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Основная информация
                  </h4>
                  <div className="space-y-4 pl-6 border-l-2 border-[#E2E8F0]">
                    <Input
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                    
                    <Input
                      label="Пароль"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      placeholder={editingUser ? 'Оставьте пустым, чтобы не менять' : ''}
                    />
                    
                    <Input
                      label="ФИО"
                      type="text"
                      value={formData.fio}
                      onChange={(e) => setFormData({ ...formData, fio: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-black mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Контактная информация
                  </h4>
                  <div className="space-y-4 pl-6 border-l-2 border-[#E2E8F0]">
                    <Input
                      label="Телефон"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    
                    <Input
                      label="Город"
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                    
                    <Input
                      label="Организация"
                      type="text"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-black mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Права доступа
                  </h4>
                  <div className="space-y-4 pl-6 border-l-2 border-[#E2E8F0]">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-black">Роль</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent transition-all"
                      >
                        <option value="participant">Участник</option>
                        <option value="judge">Судья</option>
                        <option value="admin">Администратор</option>
                      </select>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-black">Статус</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent transition-all"
                      >
                        <option value="pending">На проверке</option>
                        <option value="confirmed">Подтверждён</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#F1F5F9] px-6 sm:px-8 py-4 border-t border-[#E2E8F0] flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingUser(null)
                  resetForm()
                }}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={editingUser ? handleUpdate : handleCreate}
                className="flex-1"
              >
                {editingUser ? 'Сохранить изменения' : 'Создать пользователя'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
