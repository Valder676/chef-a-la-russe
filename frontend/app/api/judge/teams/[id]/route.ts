import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { JUDGE_ADMIN_READ, JUDGE_WRITE } from '@backend/lib/route-roles'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireRole(request, [...JUDGE_ADMIN_READ])
  if (authResult.error) return authResult.error

  try {
    const resolvedParams = await Promise.resolve(params)
    const teamId = resolvedParams.id
    
    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
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
                status: true,
              }
            }
          }
        },
        results: {
          orderBy: {
            createdAt: 'desc',
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(team)
  } catch (error: any) {
    console.error('Get team error:', error)
    const errorMessage = error?.message || 'Internal server error'
    console.error('Error details:', {
      error: errorMessage,
      stack: error?.stack,
    })
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
  if (authResult.error) return authResult.error

  try {
    const { id: teamId } = await Promise.resolve(params)
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }
    const body = await request.json()
    const { name, category, championshipType } = body
    const data: {
      name?: string
      category?: string
      championshipType?: string
    } = {}
    if (typeof name === 'string' && name.trim()) data.name = name.trim()
    if (typeof category === 'string' && category.trim()) data.category = category.trim()
    if (championshipType === 'adult' || championshipType === 'junior') data.championshipType = championshipType

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 })
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data,
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
                status: true,
              },
            },
          },
        },
        results: { orderBy: { createdAt: 'desc' } },
      },
    })
    return NextResponse.json(team)
  } catch (error: any) {
    console.error('Update team error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
  if (authResult.error) return authResult.error

  try {
    const { id: teamId } = await Promise.resolve(params)
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }
    await prisma.team.delete({ where: { id: teamId } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Delete team error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
