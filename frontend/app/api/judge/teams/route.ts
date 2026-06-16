import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { JUDGE_ADMIN_READ, JUDGE_WRITE } from '@backend/lib/route-roles'
import { teamScoresForStage } from '@backend/lib/team-score-stats'
import { validateUsersForTeamAdd } from '@backend/lib/user-team-rules'

function resolveChampionshipType(explicit: unknown, category: string): 'adult' | 'junior' {
  if (explicit === 'junior') return 'junior'
  if (explicit === 'adult') return 'adult'
  if (/юниор|junior/i.test(category)) return 'junior'
  return 'adult'
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [...JUDGE_ADMIN_READ])
  if (authResult.error) return authResult.error

  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fio: true,
                email: true,
                phone: true,
                city: true,
                organization: true,
              }
            }
          }
        },
        results: {
          select: {
            id: true,
            judgeId: true,
            dishNumber: true,
            total: true,
            stage: true,
            status: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    })

    const teamsWithAvgScore = teams.map((team) => {
      const { stage, stageResults, avgScore, hasScores, count } = teamScoresForStage(
        team,
        team.results
      )

      return {
        ...team,
        stage,
        avgScore: hasScores ? avgScore.toFixed(2) : null,
        stageResultCount: count,
      }
    })

    return NextResponse.json(teamsWithAvgScore)
  } catch (error: any) {
    console.error('Get teams error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, [...JUDGE_ADMIN_READ])
  if (authResult.error) return authResult.error

  try {
    const body = await request.json()
    const { name, category, userIds, championshipType: rawType } = body

    if (!name || !category) {
      return NextResponse.json(
        { error: 'name and category are required' },
        { status: 400 }
      )
    }

    const championshipType = resolveChampionshipType(rawType, String(category))

    let membersNested: { create: { userId: string; status: string }[] } | undefined
    if (userIds && userIds.length > 0) {
      const uniqueUserIds = [...new Set(userIds as string[])]
      const teamCheck = await validateUsersForTeamAdd(uniqueUserIds)
      if (!teamCheck.ok) {
        return NextResponse.json({ error: teamCheck.error }, { status: 409 })
      }

      const users = await prisma.user.findMany({
        where: { id: { in: uniqueUserIds } },
        select: { id: true, status: true },
      })
      membersNested = {
        create: uniqueUserIds.map((userId: string) => {
          const u = users.find((x) => x.id === userId)
          return {
            userId,
            status: u?.status === 'confirmed' ? 'confirmed' : 'pending',
          }
        }),
      }
    }

    const team = await prisma.team.create({
      data: {
        name,
        category,
        championshipType,
        status: 'confirmed',
        members: membersNested,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fio: true,
                email: true,
                phone: true,
                city: true,
                organization: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json(team)
  } catch (error: unknown) {
    console.error('Create team error:', error)
    const err = error as { code?: string }
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Один из участников уже состоит в другой команде' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
  if (authResult.error) return authResult.error

  try {
    const body = await request.json()
    const { teamId, status } = body

    if (!teamId || !status) {
      return NextResponse.json(
        { error: 'teamId and status are required' },
        { status: 400 }
      )
    }

    if (!['pending', 'confirmed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { status },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fio: true,
                email: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json(team)
  } catch (error: any) {
    console.error('Update team status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
