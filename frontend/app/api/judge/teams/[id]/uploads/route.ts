import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireAuth } from '@backend/lib/middleware'
import { canAccessTeamUploadContent } from '@backend/lib/team-upload-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const resolvedParams = await Promise.resolve(params)
    const teamId = resolvedParams.id
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    const allowed = await canAccessTeamUploadContent(prisma, authResult.user, teamId)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const uploads = await prisma.upload.findMany({
      where: { teamId },
      include: {
        user: { select: { id: true, fio: true, email: true } },
      },
      orderBy: [{ dishNumber: 'asc' }, { fileType: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(uploads)
  } catch (error: any) {
    console.error('Get team dish uploads error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
