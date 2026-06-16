import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { JUDGE_WRITE } from '@backend/lib/route-roles'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
  if (authResult.error) return authResult.error

  try {
    const { id: teamId } = await Promise.resolve(params)
    const body = await request.json()
    const stage = body?.stage as 'qualifier' | 'final'

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }
    if (!['qualifier', 'final'].includes(stage)) {
      return NextResponse.json({ error: 'stage must be qualifier or final' }, { status: 400 })
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { stage },
      select: { id: true, stage: true },
    })

    return NextResponse.json(team)
  } catch (error: any) {
    console.error('Update team stage error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

