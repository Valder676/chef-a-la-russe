import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireAuth } from '@backend/lib/middleware'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getUploadsRoot } from '@backend/lib/upload-paths'

const UPLOAD_DIR = join(getUploadsRoot(), 'documents')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const resolvedParams = await Promise.resolve(params)
    const documentId = resolvedParams.id

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { user: { select: { id: true, fio: true } } }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const isOwner = document.userId === authResult.user.id
    const isAdminOrJudge = ['admin', 'judge'].includes(authResult.user.role)

    if (!isOwner && !isAdminOrJudge) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const filePath = join(UPLOAD_DIR, document.fileName)
    
    try {
      const fileBuffer = await readFile(filePath)

    const extFromStored =
      document.fileName.includes('.') && document.fileName.length > 0
        ? document.fileName.split('.').pop()?.toLowerCase()
        : document.name.split('.').pop()?.toLowerCase()
    const ext = extFromStored || ''
    let contentType = 'application/octet-stream'

    if (ext === 'pdf') {
      contentType = 'application/pdf'
    } else if (['jpg', 'jpeg'].includes(ext)) {
      contentType = 'image/jpeg'
    } else if (ext === 'png') {
      contentType = 'image/png'
    } else if (ext === 'gif') {
      contentType = 'image/gif'
    } else if (ext === 'webp') {
      contentType = 'image/webp'
    } else if (ext === 'svg') {
      contentType = 'image/svg+xml'
    } else if (ext === 'bmp') {
      contentType = 'image/bmp'
    } else if (ext === 'doc') {
      contentType = 'application/msword'
    } else if (ext === 'docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${encodeURIComponent(document.name)}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } catch (fileError: any) {
      console.error('File read error:', fileError)
      if (fileError.code === 'ENOENT') {
        return NextResponse.json(
          { error: 'File not found on server' },
          { status: 404 }
        )
      }
      throw fileError
    }
  } catch (error: any) {
    console.error('View document error:', error)
    const errorMessage = error?.message || 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
