import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$connect()
    console.log('✅ Подключение к базе данных успешно!')

    const userCount = await prisma.user.count()
    console.log(`📊 Пользователей в базе: ${userCount}`)

    const teamCount = await prisma.team.count()
    console.log(`📊 Команд в базе: ${teamCount}`)

    const allUsers = await prisma.user.findMany({
      select: { email: true, fio: true, role: true, status: true },
      orderBy: { createdAt: 'desc' },
    })

    if (allUsers.length > 0) {
      console.log('\n👥 Все пользователи в базе:')
      allUsers.forEach(user => {
        const roleIcon =
          user.role === 'admin' ? '👑' :
            user.role === 'judge' ? '🎯' :
              user.role === 'participant' ? '👤' : '👥'
        console.log(`  ${roleIcon} ${user.fio} (${user.email})`)
        console.log(`     Роль: ${user.role}, Статус: ${user.status}`)
      })
    }

    const judges = await prisma.user.findMany({
      where: { role: 'judge' },
      select: { email: true, fio: true, status: true },
    })

    if (judges.length > 0) {
      console.log(`\n✅ Найдено судей: ${judges.length}`)
    } else {
      console.log('\n⚠️  Судьи не найдены')
      console.log('   Создайте судью: npm run create-judge')
    }

    console.log('\n✅ База данных готова к работе!')
  } catch (error: any) {
    console.error('❌ Ошибка:')
    console.error(error.message)

    if (error.message.includes('P1001') || error.message.includes('does not exist')) {
      if (error.message.includes('does not exist')) {
        console.error('\n💡 Таблицы не созданы! Выполните:')
        console.error('   npm run db:push')
        console.error('   или')
        console.error('   npm run db:migrate')
      } else {
        console.error('\n💡 Проверьте:')
        console.error('   1. PostgreSQL запущен?')
        console.error('   2. DATABASE_URL в .env правильный?')
        console.error('   3. База данных создана?')
      }
    }

    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
