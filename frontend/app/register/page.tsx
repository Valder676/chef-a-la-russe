'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isAuthenticated } = useAuth()
  
  const [formData, setFormData] = useState({
    fio: '',
    email: '',
    phone: '',
    city: '',
    organization: '',
    password: '',
    birthDate: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.fio.trim()) {
      setError('ФИО обязательно для заполнения')
      return
    }
    if (!formData.email.trim()) {
      setError('Email обязателен для заполнения')
      return
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов')
      return
    }

    setLoading(true)

    try {
      await register({
        email: formData.email,
        password: formData.password,
        fio: formData.fio,
        phone: formData.phone || undefined,
        city: formData.city || undefined,
        organization: formData.organization || undefined,
        birthDate: formData.birthDate || undefined,
      })
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации. Проверьте введенные данные.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-[1292px] bg-white rounded-[26px] shadow-[0px_4px_17.9px_rgba(0,0,0,0.19)] p-6 sm:p-7 md:p-8 lg:p-10">
        <div className="bg-white rounded-[26px] shadow-[0px_4px_17.8px_rgba(0,0,0,0.25)] p-6 sm:p-7 md:p-8 max-w-[800px] mx-auto">
          <div className="max-w-[676px] mx-auto">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl md:text-[20.3px] font-semibold text-black mb-4 sm:mb-6 text-center">
              Вход /Регистрация
            </h2>
            
            <div className="relative bg-[#F1F5F9] rounded-[5px] h-[42px] sm:h-[47px] mb-6 sm:mb-8">
              <div className="absolute top-[3px] sm:top-[4px] left-[3px] sm:left-[4px] right-[3px] sm:right-[4px] bottom-[3px] sm:bottom-[4px] flex">
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="flex-1 rounded-[5px] flex items-center justify-center transition-colors text-[#748398]"
                >
                  <span className="text-xs sm:text-sm md:text-[14.93px] font-medium">Вход</span>
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-[5px] flex items-center justify-center transition-colors bg-white text-black shadow-sm"
                >
                  <span className="text-xs sm:text-sm md:text-[13.92px] font-medium">Регистрация</span>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form className="space-y-4 sm:space-y-5 md:space-y-6" onSubmit={handleSubmit}>
            <Input
              label="ФИО"
              type="text"
              value={formData.fio}
              onChange={(e) => setFormData({ ...formData, fio: e.target.value })}
              placeholder="Введите ФИО"
              required
              disabled={loading}
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Введите email"
              required
              disabled={loading}
            />

            <Input
              label="Телефон"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Введите телефон"
              disabled={loading}
            />

            <Input
              label="Дата рождения"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              disabled={loading}
            />

            <Input
              label="Город"
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Введите город"
              disabled={loading}
            />

            <Input
              label="Учреждение / организация"
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              placeholder="Введите организацию"
              disabled={loading}
            />

            <Input
              label="Пароль"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Придумайте пароль (не менее 6 символов)"
              required
              disabled={loading}
            />

            <Button
              type="submit"
              className="w-full flex items-center justify-center gap-3 group"
              disabled={loading}
            >
              <img
                src="/icons/checkmark-icon.png"
                alt="Check"
                width={20}
                height={20}
                className="brightness-0 group-hover:invert transition-all"
              />
              <span>{loading ? 'Регистрация...' : 'Создать аккаунт'}</span>
            </Button>
          </form>

          <p className="text-center mt-4 sm:mt-6 text-xs sm:text-sm text-gray-600">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-[#0F172A] font-semibold">
              Войти
            </Link>
          </p>
          </div>
        </div>
      </div>
    </div>
  )
}
