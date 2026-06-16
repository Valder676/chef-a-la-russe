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
      },
      include: {
        team: {
          include: {
            results: true
          }
        }
      }
    })

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    const allTeams = await prisma.team.findMany({
      include: {
        results: true
      }
    })

    const teamsWithScores = allTeams.map(team => {
      const results = team.results
      
      const groupedByJudge: { [key: string]: typeof results } = {}
      results.forEach(result => {
        if (!groupedByJudge[result.judgeId]) {
          groupedByJudge[result.judgeId] = []
        }
        groupedByJudge[result.judgeId].push(result)
      })

      let avgScore = 0
      if (Object.keys(groupedByJudge).length > 0) {
        const judgeAverages = Object.values(groupedByJudge).map(judgeResults => {
          const total = judgeResults.reduce((sum, r) => sum + r.total, 0)
          return total / judgeResults.length
        })
        avgScore = judgeAverages.reduce((sum, avg) => sum + avg, 0) / judgeAverages.length
      }

      const totalPenalties = results.reduce((sum, r) => sum + (r.penalties || 0), 0)

      return {
        id: team.id,
        name: team.name,
        category: team.category,
        avgScore,
        totalPenalties,
        finalScore: avgScore - totalPenalties
      }
    })

    const sortedTeams = teamsWithScores.sort((a, b) => b.finalScore - a.finalScore)

    return NextResponse.json(sortedTeams)
  } catch (error: any) {
    console.error('Get ranking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
