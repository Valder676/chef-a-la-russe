import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'judge@example.com'
  const password = process.argv[3] || 'Judge123!'
  const fio = process.argv[4] || 'Судья чемпионата'

  if (!email || email === 'judge@example.com') {
    console.error('❌ Укажите email судьи')
    console.error('\nИспользование:')
    console.error('  npm run create-judge [email] [password] [fio]')
    console.error('\nПример:')
    console.error('  npm run create-judge judge@example.com Judge123! "Иван Иванов"')
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const judge = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'judge',
      status: 'confirmed',
      password: hashedPassword,
      fio,
    },
    create: {
      email,
      password: hashedPassword,
      fio,
      role: 'judge',
      status: 'confirmed',
    },
  })

  console.log('✅ Судья создан/обновлен:')
  console.log({
    id: judge.id,
    email: judge.email,
    fio: judge.fio,
    role: judge.role,
    status: judge.status,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
