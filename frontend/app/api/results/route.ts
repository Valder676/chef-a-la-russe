import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireAuth } from '@backend/lib/middleware'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: authResult.user.id,
      }
    })

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    const results = await prisma.result.findMany({
      where: {
        teamId: teamMember.teamId,
      },
      orderBy: {
        createdAt: 'desc',
      }
    })

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Get results error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
