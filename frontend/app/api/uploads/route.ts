import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireAuth } from '@backend/lib/middleware'
import { activeStageDishCount } from '@backend/lib/dish-count'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { getUploadsRoot } from '@backend/lib/upload-paths'

const UPLOAD_DIR = join(getUploadsRoot(), 'files')

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const membership = await prisma.teamMember.findFirst({
      where: { userId: authResult.user.id },
      select: { teamId: true },
    })
    if (!membership) {
      return NextResponse.json([])
    }

    const uploads = await prisma.upload.findMany({
      where: { teamId: membership.teamId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(uploads)
  } catch (error: any) {
    console.error('Get uploads error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const membership = await prisma.teamMember.findFirst({
      where: { userId: authResult.user.id },
      include: {
        team: { select: { id: true, category: true, championshipType: true, stage: true } },
      },
    })
    if (!membership?.team) {
      return NextResponse.json(
        { error: 'Нужно состоять в команде, чтобы загружать фото и документы по блюдам' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const dishNumber = parseInt(formData.get('dishNumber') as string)
    const fileType = formData.get('fileType') as string

    if (!file || dishNumber === undefined || Number.isNaN(dishNumber) || !fileType) {
      return NextResponse.json(
        { error: 'File, dishNumber and fileType are required' },
        { status: 400 }
      )
    }

    if (!['photo', 'techCard', 'menu'].includes(fileType)) {
      return NextResponse.json(
        { error: 'fileType must be "photo", "techCard" or "menu"' },
        { status: 400 }
      )
    }

    if (fileType === 'menu' && dishNumber !== 0) {
      return NextResponse.json({ error: 'For menu, dishNumber must be 0' }, { status: 400 })
    }

    const t = membership.team
    if (fileType !== 'menu') {
      const dishCount = activeStageDishCount(t)
      if (dishNumber < 1 || dishNumber > dishCount) {
        return NextResponse.json(
          { error: `dishNumber must be 1..${dishCount} for photo/techCard` },
          { status: 400 }
        )
      }
    }

    await mkdir(UPLOAD_DIR, { recursive: true })

    const existing = await prisma.upload.findFirst({
      where: {
        teamId: membership.teamId,
        dishNumber,
        fileType,
      },
    })
    if (existing) {
      const slotLabel =
        fileType === 'photo' ? 'фото' : fileType === 'techCard' ? 'технологическую карту' : 'меню'
      return NextResponse.json(
        { error: `Сначала открепите старое ${slotLabel}` },
        { status: 409 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = `${Date.now()}-${file.name}`
    const filePath = join(UPLOAD_DIR, fileName)

    await writeFile(filePath, buffer)

    const upload = await prisma.upload.create({
      data: {
        teamId: membership.teamId,
        userId: authResult.user.id,
        dishNumber,
        fileType,
        fileName: fileName,
        fileSize: file.size,
        status: 'pending',
      },
    })

    return NextResponse.json(upload)
  } catch (error: unknown) {
    console.error('Upload file error:', error)
    const err = error as NodeJS.ErrnoException & { code?: string }
    if (err?.code === 'P2003') {
      return NextResponse.json(
        {
          error:
            'База данных не обновлена: выполните миграции (npx prisma migrate deploy в backend с DATABASE_URL).',
        },
        { status: 503 }
      )
    }
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
      return NextResponse.json(
        {
          error:
            'Нет прав на запись в каталог загрузок. На VPS: sudo chown -R 1001:1001 uploads && sudo chmod -R u+rwX uploads',
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
