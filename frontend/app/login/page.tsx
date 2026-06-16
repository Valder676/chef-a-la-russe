'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, user } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        router.push('/admin')
      } else if (user.role === 'judge') {
        router.push('/judge')
      } else {
        router.push('/')
      }
    }
  }, [isAuthenticated, user, router])
  
  if (isAuthenticated) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message || 'Неверный email или пароль')
      setLoading(false)
    }
  }

  return (
    <div className="chef-login-root">
      <div className="chef-login-card-outer">
        <div className="chef-login-card-inner">
          <div className="chef-login-content">
          <div className="chef-login-header-block">
            <h2 className="chef-login-title">
              Вход /Регистрация
            </h2>
            
            <div className="chef-login-tabs">
              <div className="chef-login-tabs-row">
                <button
                  type="button"
                  className="chef-login-tab-on"
                >
                  <span className="chef-login-tab-label-on">Вход</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/register')}
                  className="chef-login-tab-off"
                >
                  <span className="chef-login-tab-label-off">Регистрация</span>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="chef-login-error">
              <p className="chef-login-error-text">{error}</p>
            </div>
          )}

          <form className="chef-login-form" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            <Input
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />

            <Button
              type="submit"
              className="group chef-login-submit"
              disabled={loading}
            >
              <img
                src="/icons/login-icon.png"
                alt="Login"
                width={20}
                height={20}
                className="chef-login-icon"
              />
              <span>{loading ? 'Вход...' : 'Войти'}</span>
            </Button>
          </form>

          <p className="chef-login-footer">
            Нет аккаунта?{' '}
            <Link href="/register" className="chef-login-register-link">
              Зарегистрироваться
            </Link>
          </p>
          </div>
        </div>
      </div>
    </div>
  )
}
