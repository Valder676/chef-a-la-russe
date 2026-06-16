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
            }
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

    return NextResponse.json(teamMember.team)
  } catch (error: any) {
    console.error('Get team error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
