import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { JUDGE_ADMIN_READ } from '@backend/lib/route-roles'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [...JUDGE_ADMIN_READ])
  if (authResult.error) return authResult.error

  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const teamId = searchParams.get('teamId')

    let whereClause: any = {}

    if (teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } })
      if (!team) {
        return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
      }
      const members = await prisma.teamMember.findMany({
        where: { teamId },
        select: { userId: true },
      })
      const memberIds = members.map((m) => m.userId)
      if (memberIds.length === 0) {
        whereClause.userId = { in: [] }
      } else if (userId) {
        if (!memberIds.includes(userId)) {
          return NextResponse.json(
            { error: 'Участник не входит в выбранную команду' },
            { status: 400 }
          )
        }
        whereClause.userId = userId
      } else {
        whereClause.userId = { in: memberIds }
      }
    } else if (userId) {
      whereClause.userId = userId
    }

    const hasFilter = Object.keys(whereClause).length > 0
    const documents = await prisma.document.findMany({
      ...(hasFilter ? { where: whereClause } : {}),
      include: {
        user: {
          select: {
            id: true,
            fio: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    })

    return NextResponse.json(documents)
  } catch (error: any) {
    console.error('Get documents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
