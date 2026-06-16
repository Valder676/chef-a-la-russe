import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { JUDGE_WRITE } from '@backend/lib/route-roles'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { getUploadsRoot } from '@backend/lib/upload-paths'
import {
  buildStoredViolationFileName,
  contentTypeFromViolationFileName,
  isPreviewableImageType,
  resolveViolationPhotoPath,
} from '@backend/lib/violation-photo-file'

const UPLOAD_DIR = join(getUploadsRoot(), 'violations')
const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_PHOTOS_PER_DISH_CRITERION = 5

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
  if (authResult.error) return authResult.error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const resultId = formData.get('resultId') as string
    const criterionKey = formData.get('criterionKey') as string

    if (!file || !resultId || !criterionKey) {
      return NextResponse.json(
        { error: 'File, resultId and criterionKey are required' },
        { status: 400 }
      )
    }

    const allowed = [
      'miseEnPlace',
      'hygieneWaste',
      'professionalPrep',
      'innovation',
      'service',
      'presentation',
      'tasteTexture',
    ]
    if (!allowed.includes(criterionKey)) {
      return NextResponse.json(
        { error: 'Invalid criterionKey' },
        { status: 400 }
      )
    }

    const result = await prisma.result.findUnique({
      where: { id: resultId }
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Result not found' },
        { status: 404 }
      )
    }

    const requester = authResult.user
    if (requester.role !== 'admin' && result.judgeId !== requester.id) {
      return NextResponse.json(
        { error: 'Forbidden: можно загружать фото только в свой лист' },
        { status: 403 }
      )
    }

    if (result.status === 'fixed' && requester.role !== 'admin') {
      return NextResponse.json(
        { error: 'Лист зафиксирован. Разблокируйте лист, чтобы добавить фото.' },
        { status: 400 }
      )
    }

    const existingCount = await prisma.violationPhoto.count({
      where: { resultId, criterionKey },
    })
    if (existingCount >= MAX_PHOTOS_PER_DISH_CRITERION) {
      return NextResponse.json(
        { error: `Можно прикрепить не более ${MAX_PHOTOS_PER_DISH_CRITERION} фото на блюдо` },
        { status: 400 }
      )
    }

    const mime = file.type || contentTypeFromViolationFileName(file.name)
    if (!ALLOWED_UPLOAD_TYPES.includes(mime) && !isPreviewableImageType(mime, file.name)) {
      return NextResponse.json(
        { error: 'Допустимы только JPG, PNG, GIF или WebP' },
        { status: 400 }
      )
    }

    await mkdir(UPLOAD_DIR, { recursive: true })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = buildStoredViolationFileName(file.name)
    const filePath = join(UPLOAD_DIR, fileName)

    await writeFile(filePath, buffer)

    const violationPhoto = await prisma.violationPhoto.create({
      data: {
        resultId,
        criterionKey,
        fileName: fileName,
        fileSize: file.size,
      }
    })

    return NextResponse.json(violationPhoto)
  } catch (error: any) {
    console.error('Upload violation photo error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
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
      where: { id: photoId }
    })

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    const resultForPhoto = await prisma.result.findUnique({
      where: { id: photo.resultId },
      select: { judgeId: true, status: true },
    })
    const requester = authResult.user
    if (
      requester.role !== 'admin' &&
      (!resultForPhoto || resultForPhoto.judgeId !== requester.id)
    ) {
      return NextResponse.json(
        { error: 'Forbidden: можно удалять фото только из своего листа' },
        { status: 403 }
      )
    }

    if (resultForPhoto?.status === 'fixed' && requester.role !== 'admin') {
      return NextResponse.json(
        { error: 'Лист зафиксирован. Разблокируйте лист, чтобы удалить фото.' },
        { status: 400 }
      )
    }

    const resolved = await resolveViolationPhotoPath(photo.fileName)
    if (resolved) {
      try {
        await unlink(resolved)
      } catch (error) {
        console.warn('Could not delete violation photo file:', photo.fileName, error)
      }
    } else {
      console.warn('Violation photo file not found on disk:', photo.fileName)
    }

    await prisma.violationPhoto.delete({
      where: { id: photoId }
    })

    return NextResponse.json({ message: 'Photo deleted successfully' })
  } catch (error: any) {
    console.error('Delete violation photo error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
