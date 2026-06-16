import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { ADMIN_ONLY } from '@backend/lib/route-roles'
import { teamScoresForStage } from '@backend/lib/team-score-stats'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [...ADMIN_ONLY])
  if (authResult.error) return authResult.error

  try {
    const [users, teams, resultCount] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, role: true, status: true },
      }),
      prisma.team.findMany({
        include: {
          results: {
            select: {
              id: true,
              total: true,
              stage: true,
            },
          },
        },
      }),
      prisma.result.count(),
    ])

    const usersByRole = {
      participant: users.filter((u) => u.role === 'participant').length,
      judge: users.filter((u) => u.role === 'judge').length,
      admin: users.filter((u) => u.role === 'admin').length,
    }

    const usersByStatus = {
      confirmed: users.filter((u) => u.status === 'confirmed').length,
      pending: users.filter((u) => u.status === 'pending').length,
      rejected: users.filter((u) => u.status === 'rejected').length,
    }

    const teamsByStatus = {
      confirmed: teams.filter((t) => t.status === 'confirmed').length,
      pending: teams.filter((t) => t.status === 'pending').length,
    }

    const teamsByCategory: Record<string, number> = {}
    teams.forEach((t) => {
      teamsByCategory[t.category] = (teamsByCategory[t.category] || 0) + 1
    })

    const ranked = teams
      .map((team) => {
        const { avgScore, hasScores, stage, count } = teamScoresForStage(team, team.results)
        return {
          id: team.id,
          name: team.name,
          category: team.category,
          stage,
          avgScore: hasScores ? avgScore : 0,
          hasScores,
          stageResultCount: count,
        }
      })
      .filter((t) => t.hasScores)
      .sort((a, b) => b.avgScore - a.avgScore)

    const avgTeamScore =
      ranked.length > 0
        ? ranked.reduce((sum, t) => sum + t.avgScore, 0) / ranked.length
        : 0

    return NextResponse.json({
      totalUsers: users.length,
      totalTeams: teams.length,
      totalResults: resultCount,
      usersByRole,
      usersByStatus,
      teamsByStatus,
      teamsByCategory,
      avgTeamScore: avgTeamScore.toFixed(2),
      topTeams: ranked.slice(0, 5).map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        avgScore: t.avgScore,
        stage: t.stage,
      })),
    })
  } catch (error) {
    console.error('Admin statistics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
