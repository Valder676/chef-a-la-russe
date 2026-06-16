import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { JUDGE_WRITE } from '@backend/lib/route-roles'
import type { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
  if (authResult.error) return authResult.error

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || undefined

    let where: Prisma.UploadWhereInput = {}
    if (userId) {
      const tm = await prisma.teamMember.findFirst({
        where: { userId },
        select: { teamId: true },
      })
      if (!tm) {
        return NextResponse.json([])
      }
      where = { teamId: tm.teamId }
    }

    const uploads = await prisma.upload.findMany({
      where,
      include: {
        user: { select: { id: true, fio: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(uploads)
  } catch (error: any) {
    console.error('Get judge uploads error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
