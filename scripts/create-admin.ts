import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 3) {
    console.error('Использование: npm run create-admin <email> <password> <fio>')
    console.error('Пример: npm run create-admin admin@example.com "SuperSecret@2026#Admin" "Главный Администратор"')
    process.exit(1)
  }

  const [email, password, fio] = args

  console.log(`Создание администратора...`)
  console.log(`Email: ${email}`)
  console.log(`ФИО: ${fio}`)

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.error(`❌ Ошибка: Пользователь с email ${email} уже существует!`)
      process.exit(1)
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fio,
        role: 'admin',
        status: 'confirmed',
      },
      select: {
        id: true,
        email: true,
        fio: true,
        role: true,
        status: true,
      }
    })

    console.log('\n✅ Администратор успешно создан!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`ID:        ${admin.id}`)
    console.log(`Email:     ${admin.email}`)
    console.log(`ФИО:       ${admin.fio}`)
    console.log(`Роль:      ${admin.role}`)
    console.log(`Статус:    ${admin.status}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n🔐 Вы можете войти в систему используя этот email и пароль.')
    console.log('   Откройте http://localhost:3000/login')
    console.log('   После входа вы будете перенаправлены на панель администратора.')
  } catch (error) {
    console.error('❌ Ошибка при создании администратора:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
