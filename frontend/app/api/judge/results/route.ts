import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { JUDGE_ADMIN_READ } from '@backend/lib/route-roles'
import { teamScoresForStage } from '@backend/lib/team-score-stats'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [...JUDGE_ADMIN_READ])
  if (authResult.error) return authResult.error

  try {
    const teams = await prisma.team.findMany({
      include: {
        results: {
          select: {
            id: true,
            judgeId: true,
            dishNumber: true,
            total: true,
            stage: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    })

    const teamsWithScores = teams
      .map((team) => {
        const { stage, avgScore, totalScore, hasScores, count } = teamScoresForStage(
          team,
          team.results
        )

        return {
          id: team.id,
          name: team.name,
          category: team.category,
          stage,
          avgScore: hasScores ? avgScore : 0,
          totalScore: hasScores ? totalScore : 0,
          stageResultCount: count,
          hasScores,
        }
      })
      .filter((t) => t.hasScores)
      .sort((a, b) => b.avgScore - a.avgScore)
    .map((team, index) => ({
      ...team,
      place: index + 1,
    }))

    return NextResponse.json(teamsWithScores)
  } catch (error: any) {
    console.error('Get results error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
