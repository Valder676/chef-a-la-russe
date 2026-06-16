import { prisma } from '../lib/prisma'
import { comparePassword, generateToken } from '../lib/auth'
import { normalizeEmail } from '../lib/normalize-email'
import { findUserByNormalizedEmail } from '../lib/user-team-rules'

export async function loginWithEmailPassword(email: string, password: string) {
  const user = await findUserByNormalizedEmail(normalizeEmail(email))

  if (!user) {
    return { ok: false as const, error: 'Неверный email или пароль' as const }
  }

  const isPasswordValid = await comparePassword(password, user.password)
  if (!isPasswordValid) {
    return { ok: false as const, error: 'Неверный email или пароль' as const }
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  })

  return {
    ok: true as const,
    token,
    user: {
      id: user.id,
      email: user.email,
      fio: user.fio,
      phone: user.phone,
      city: user.city,
      organization: user.organization,
      role: user.role,
      status: user.status,
    },
  }
}
