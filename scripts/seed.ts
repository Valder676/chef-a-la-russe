import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function ensureUser(params: {
  email: string
  password: string
  fio: string
  role: string
}) {
  const existing = await prisma.user.findUnique({
    where: { email: params.email },
  })

  if (existing) {
    console.log(`ℹ Пользователь ${params.email} уже существует (роль: ${existing.role})`)
    return existing
  }

  const hashedPassword = await bcrypt.hash(params.password, 10)

  const user = await prisma.user.create({
    data: {
      email: params.email,
      password: hashedPassword,
      fio: params.fio,
      role: params.role,
      status: 'confirmed',
    },
    select: {
      id: true,
      email: true,
      fio: true,
      role: true,
      status: true,
    },
  })

  console.log(`✅ Создан пользователь (${params.role}): ${user.email}`)
  return user
}

async function main() {
  console.log('🚀 Запуск сидирования базы данных...')

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!'
  const adminFio = process.env.SEED_ADMIN_FIO || 'Главный Администратор'

  const judgeEmail = process.env.SEED_JUDGE_EMAIL || 'judge@example.com'
  const judgePassword = process.env.SEED_JUDGE_PASSWORD || 'Judge123!'
  const judgeFio = process.env.SEED_JUDGE_FIO || 'Судья чемпионата'

  await ensureUser({
    email: adminEmail,
    password: adminPassword,
    fio: adminFio,
    role: 'admin',
  })

  await ensureUser({
    email: judgeEmail,
    password: judgePassword,
    fio: judgeFio,
    role: 'judge',
  })

  console.log('\n🎉 Сидирование завершено. Можно входить в систему с созданными учетными данными.')
}

main()
  .catch((error) => {
    console.error('❌ Ошибка при сидировании базы данных:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

