import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireAuth } from '@backend/lib/middleware'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { getUploadsRoot } from '@backend/lib/upload-paths'

const UPLOAD_DIR = join(getUploadsRoot(), 'documents')
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: 'Паспорт',
  medbook: 'Медицинская книжка',
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const documents = await prisma.document.findMany({
      where: {
        userId: authResult.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      }
    })

    return NextResponse.json(documents)
  } catch (error: any) {
    console.error('Get documents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = String(formData.get('documentType') || '')

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }
    if (!DOCUMENT_TYPE_LABELS[documentType]) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      )
    }

    await mkdir(UPLOAD_DIR, { recursive: true })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = `${Date.now()}-${file.name}`
    const filePath = join(UPLOAD_DIR, fileName)

    await writeFile(filePath, buffer)

    const label = DOCUMENT_TYPE_LABELS[documentType]
    const prefix = `${label}: `
    const prevDocs = await prisma.document.findMany({
      where: {
        userId: authResult.user.id,
        name: { startsWith: prefix },
      },
    })
    if (prevDocs.length > 0) {
      return NextResponse.json(
        { error: 'Сначала открепите старый документ' },
        { status: 409 }
      )
    }

    const document = await prisma.document.create({
      data: {
        userId: authResult.user.id,
        name: `${label}: ${file.name}`,
        fileName: fileName,
        fileSize: file.size,
        status: 'pending',
      }
    })

    return NextResponse.json(document)
  } catch (error: unknown) {
    console.error('Upload document error:', error)
    const err = error as NodeJS.ErrnoException
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
      return NextResponse.json(
        {
          error:
            'Нет прав на запись в каталог загрузок. На VPS: sudo chown -R 1001:1001 uploads && sudo chmod -R u+rwX uploads (из каталога проекта).',
        },
        { status: 503 }
      )
    }
    if (err?.code === 'ENOSPC') {
      return NextResponse.json({ error: 'Недостаточно места на диске' }, { status: 507 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
