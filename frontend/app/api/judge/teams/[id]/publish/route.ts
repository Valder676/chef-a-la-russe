import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { JUDGE_WRITE } from '@backend/lib/route-roles'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
  if (authResult.error) return authResult.error

  const { id: teamId } = await params

  try {
    const body = await request.json()
    const { resultsPublished } = body

    if (typeof resultsPublished !== 'boolean') {
      return NextResponse.json(
        { error: 'resultsPublished must be a boolean' },
        { status: 400 }
      )
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { resultsPublished },
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
        resultsPublished: true,
      },
    })

    return NextResponse.json(team)
  } catch (error: any) {
    console.error('Publish results error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
