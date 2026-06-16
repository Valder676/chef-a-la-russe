import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { JUDGE_ADMIN_READ, JUDGE_WRITE } from '@backend/lib/route-roles'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [...JUDGE_ADMIN_READ])
  if (authResult.error) return authResult.error

  try {
    const users = await prisma.user.findMany({
      where: {
        role: 'participant',
      },
      select: {
        id: true,
        fio: true,
        email: true,
        phone: true,
        city: true,
        organization: true,
        status: true,
        createdAt: true,
        documents: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        teamMembers: {
          select: {
            teamId: true,
            team: {
              select: {
                id: true,
                name: true,
                uploads: {
                  select: {
                    id: true,
                    dishNumber: true,
                    fileType: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      }
    })

    return NextResponse.json(users)
  } catch (error: any) {
    console.error('Get participants error:', error)
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
    const { userId, status } = body

    if (!userId || !status) {
      return NextResponse.json(
        { error: 'userId and status are required' },
        { status: 400 }
      )
    }

    if (!['pending', 'confirmed', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    let finalStatus = status
    if (status === 'confirmed' && existingUser.status === 'confirmed') {
      finalStatus = 'confirmed'
    } else if (status === 'confirmed') {
      finalStatus = 'confirmed'
    } else if (status === 'rejected' && existingUser.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Cannot reject confirmed user. Status remains confirmed.' },
        { status: 400 }
      )
    } else if (status === 'pending' && existingUser.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Cannot change status from confirmed to pending. Status remains confirmed.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: finalStatus },
      select: {
        id: true,
        fio: true,
        email: true,
        status: true,
      }
    })

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Update participant status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
