import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { VIOLATION_PHOTO_VIEW } from '@backend/lib/route-roles'
import {
  contentTypeFromViolationFileName,
  readViolationPhotoFile,
} from '@backend/lib/violation-photo-file'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [...VIOLATION_PHOTO_VIEW])
  if (authResult.error) return authResult.error

  try {
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('id')

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 }
      )
    }

    const photo = await prisma.violationPhoto.findUnique({
      where: { id: photoId },
    })

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    const fileBuffer = await readViolationPhotoFile(photo.fileName)
    const contentType = contentTypeFromViolationFileName(photo.fileName)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${photo.fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('not found')) {
      return NextResponse.json(
        { error: 'Photo file not found on server' },
        { status: 404 }
      )
    }
    console.error('View violation photo error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
