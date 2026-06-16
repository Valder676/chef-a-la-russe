import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fio: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (users.length === 0) {
    console.log('Пользователей нет')
    return
  }

  console.log(`Пользователей: ${users.length}\n`)
  for (const u of users) {
    console.log(`${u.fio} <${u.email}>`)
    console.log(`  id: ${u.id}`)
    console.log(`  role: ${u.role}, status: ${u.status}`)
    console.log(`  createdAt: ${u.createdAt.toISOString()}`)
    console.log('')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

