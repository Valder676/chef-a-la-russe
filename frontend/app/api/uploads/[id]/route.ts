import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireAuth } from '@backend/lib/middleware'
import { canAccessTeamUploadContent } from '@backend/lib/team-upload-access'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { getUploadsRoot } from '@backend/lib/upload-paths'

const UPLOAD_DIR = join(getUploadsRoot(), 'files')

export async function DELETE(
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
    })

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    const allowed = await canAccessTeamUploadContent(prisma, authResult.user, upload.teamId)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
      const filePath = join(UPLOAD_DIR, upload.fileName)
      await unlink(filePath)
    } catch {
      // файл уже удалён с диска — запись всё равно убираем
    }

    await prisma.upload.delete({ where: { id: uploadId } })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Delete upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
