'use client'

import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface PasswordChangeModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: { current: string; newPassword: string; confirm: string }) => void
  saving?: boolean
}

export default function PasswordChangeModal({
  open,
  onClose,
  onSubmit,
  saving = false,
}: PasswordChangeModalProps) {
  const [current, setCurrent] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    if (!open) {
      setCurrent('')
      setNewPassword('')
      setConfirm('')
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] p-6 max-w-md w-full shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-black">Сменить пароль</h3>

        <Input
          label="Текущий пароль"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Введите текущий пароль"
        />
        <Input
          label="Новый пароль"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Не менее 6 символов"
        />
        <Input
          label="Повтор нового пароля"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Повторите пароль"
        />

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit({ current, newPassword, confirm })}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>
  )
}
