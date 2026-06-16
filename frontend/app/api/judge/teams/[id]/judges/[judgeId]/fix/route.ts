import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { JUDGE_WRITE } from '@backend/lib/route-roles'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; judgeId: string }> | { id: string; judgeId: string } }
) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
  if (authResult.error) return authResult.error

  try {
    const resolved = await Promise.resolve(params)
    const teamId = resolved.id
    const judgeId = resolved.judgeId
    const requester = authResult.user
    if (requester.id !== judgeId) {
      return NextResponse.json(
        { error: 'Forbidden: можно фиксировать только свой лист' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const stage = (searchParams.get('stage') as 'qualifier' | 'final') || 'qualifier'

    const results = await prisma.result.findMany({
      where: {
        teamId,
        judgeId,
        stage,
      }
    })

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'No results found to fix' },
        { status: 400 }
      )
    }

    await prisma.result.updateMany({
      where: {
        teamId,
        judgeId,
        stage,
      },
      data: {
        status: 'fixed',
      }
    })

    return NextResponse.json({ message: 'Sheet fixed successfully' })
  } catch (error: any) {
    console.error('Fix result sheet error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
