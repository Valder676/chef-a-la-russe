'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import PasswordChangeModal from '@/components/profile/PasswordChangeModal'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import AppToast, { type ToastVariant } from '@/components/ui/Toast'

export default function ProfilePage() {
  const { isAuthenticated } = useAuth()
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const [formData, setFormData] = useState<{
    fio: string
    phone: string
    organization: string
    email: string
    city: string
    birthDate: string
  }>({
    fio: '',
    phone: '',
    organization: '',
    email: '',
    city: '',
    birthDate: '',
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await api.getProfile()
        setFormData({
          fio: user.fio || '',
          phone: user.phone || '',
          organization: user.organization || '',
          email: user.email || '',
          city: user.city || '',
          birthDate: user.birthDate ? user.birthDate.substring(0, 10) : '',
        })
      } catch (error) {
        console.error('Error loading profile', error)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated) {
      loadProfile()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      await api.updateProfile({
        fio: formData.fio,
        phone: formData.phone,
        city: formData.city,
        organization: formData.organization,
        birthDate: formData.birthDate || undefined,
      })
      alert('Профиль сохранён')
    } catch (error: any) {
      alert(error.message || 'Ошибка сохранения профиля')
    } finally {
      setSaving(false)
    }
  }

  const showToast = (message: string, variant: ToastVariant) => {
    setToast({ message, variant })
  }

  const handleChangePassword = async (values: {
    current: string
    newPassword: string
    confirm: string
  }) => {
    if (!values.current) {
      showToast('Введите текущий пароль', 'error')
      return
    }
    if (!values.newPassword || values.newPassword.length < 6) {
      showToast('Новый пароль — не короче 6 символов', 'error')
      return
    }
    if (values.newPassword !== values.confirm) {
      showToast('Пароли не совпадают', 'error')
      return
    }

    try {
      setSavingPassword(true)
      await api.changePassword(values.current, values.newPassword)
      setShowPasswordChange(false)
      showToast('Пароль успешно изменён', 'success')
    } catch (error: any) {
      showToast(error.message || 'Не удалось сменить пароль', 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[110px] py-6 sm:py-8 md:py-10">
        <div className="bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 lg:p-10 mx-auto max-w-[1220px]">
          <div className="mb-4 sm:mb-6">
            <p className="text-xs sm:text-[13.47px] font-medium text-[#71717B] mb-2">
              Настройки
            </p>
            <h1 className="text-lg sm:text-xl md:text-[23.33px] font-semibold text-black">
              Профиль
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8 md:mb-10">
            <div className="bg-white rounded-[26px] shadow-[0px_4px_17.8px_rgba(0,0,0,0.25)] p-4 sm:p-6 md:p-8">
            <h2 className="text-sm sm:text-base md:text-[15.97px] font-semibold text-black mb-4 sm:mb-5 md:mb-6">
              Личные данные
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-3 sm:space-y-4">
                <Input
                  label="ФИО"
                  value={formData.fio}
                  onChange={(e) => setFormData({ ...formData, fio: e.target.value })}
                  placeholder="Введите ФИО"
                />
                
                <Input
                  label="Телефон"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Введите телефон"
                />

                <Input
                  label="Дата рождения"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Введите email"
                />
                
                <Input
                  label="Город"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Введите город"
                />
              </div>
            </div>
            
            <div className="mt-3 sm:mt-4">
              <Input
                label="Организация"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="Введите организацию"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 sm:mt-6">
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowPasswordChange(true)}
                className="w-full sm:w-auto"
              >
                Сменить пароль
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-[26px] shadow-[0px_4px_17.8px_rgba(0,0,0,0.25)] p-4 sm:p-6 md:p-8">
            <h2 className="text-sm sm:text-base md:text-[15px] font-semibold text-black mb-4 sm:mb-5 md:mb-6">
              Статусы
            </h2>
            
            <div className="space-y-4 sm:space-y-5 md:space-y-6">
              <div className="border border-[#E3E9F0] rounded-[19px] p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13.45px] font-medium text-[#71717B]">
                    Аккаунт
                  </p>
                  <div className="bg-[#0F172A] rounded-[20px] px-4 py-2">
                    <span className="text-[12.3px] font-semibold text-white">
                      Подтверждён
                    </span>
                  </div>
                </div>
                <p className="text-[12px] font-medium text-[#71717B]">
                  Подтверждение выполняют судьи.
                </p>
              </div>

              <div className="border border-[#E3E9F0] rounded-[19px] p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13.45px] font-medium text-[#71717B]">
                    Команда
                  </p>
                  <div className="bg-[#F1F5F9] rounded-[20px] px-4 py-2 inline-block max-w-[160px]">
                    <span className="text-[12.3px] font-semibold text-black block text-center whitespace-normal leading-tight">
                      Сформирована судьями
                    </span>
                  </div>
                </div>
                <p className="text-[12px] font-medium text-[#71717B]">
                  Если команда не отображается — сообщите судьям.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

        <PasswordChangeModal
          open={showPasswordChange}
          onClose={() => setShowPasswordChange(false)}
          onSubmit={handleChangePassword}
          saving={savingPassword}
        />

        {toast && (
          <AppToast
            message={toast.message}
            variant={toast.variant}
            onClose={() => setToast(null)}
          />
        )}
      </main>
    </div>
  )
}
