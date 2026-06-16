import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { JUDGE_WRITE } from '@backend/lib/route-roles'
import {
  formatUserAlreadyInTeam,
  getUserTeamConflict,
} from '@backend/lib/user-team-rules'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
  if (authResult.error) return authResult.error

  const { id: teamId } = await params

  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.role !== 'participant') {
      return NextResponse.json(
        { error: 'Only participants can be added to teams' },
        { status: 400 }
      )
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'Участник уже в этой команде' },
        { status: 400 }
      )
    }

    const otherTeam = await getUserTeamConflict(userId, teamId)
    if (otherTeam) {
      return NextResponse.json(
        { error: formatUserAlreadyInTeam(otherTeam.team.name) },
        { status: 409 }
      )
    }

    const teamMember = await prisma.teamMember.create({
      data: {
        userId,
        teamId,
        status: user.status === 'confirmed' ? 'confirmed' : 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            fio: true,
            email: true,
            phone: true,
            city: true,
            organization: true,
            status: true,
          }
        }
      }
    })

    return NextResponse.json(teamMember)
  } catch (error: unknown) {
    console.error('Add team member error:', error)
    const err = error as { code?: string }
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Участник уже состоит в другой команде' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
  if (authResult.error) return authResult.error

  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      )
    }

    await prisma.teamMember.delete({
      where: { id: memberId }
    })

    return NextResponse.json({ message: 'Team member removed successfully' })
  } catch (error: any) {
    console.error('Remove team member error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
