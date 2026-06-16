import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireAuth } from '@backend/lib/middleware'
import { canAccessTeamUploadContent } from '@backend/lib/team-upload-access'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getUploadsRoot } from '@backend/lib/upload-paths'

const UPLOAD_DIR = join(getUploadsRoot(), 'files')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const resolvedParams = await Promise.resolve(params)
    const uploadId = resolvedParams.id

    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 })
    }

    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
      select: { id: true, teamId: true, fileName: true },
    })

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    const allowed = await canAccessTeamUploadContent(prisma, authResult.user, upload.teamId)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const filePath = join(UPLOAD_DIR, upload.fileName)
    const fileBuffer = await readFile(filePath)

    const ext = upload.fileName.split('.').pop()?.toLowerCase() || ''
    let contentType = 'application/octet-stream'
    if (ext === 'pdf') contentType = 'application/pdf'
    if (['jpg', 'jpeg'].includes(ext)) contentType = 'image/jpeg'
    if (ext === 'png') contentType = 'image/png'
    if (ext === 'gif') contentType = 'image/gif'
    if (ext === 'webp') contentType = 'image/webp'
    if (ext === 'svg') contentType = 'image/svg+xml'
    if (ext === 'bmp') contentType = 'image/bmp'
    if (ext === 'doc') contentType = 'application/msword'
    if (ext === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(upload.fileName)}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: any) {
    console.error('View upload error:', error)
    const errorMessage = error?.message || 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

