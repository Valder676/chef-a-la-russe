import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireAuth } from '@backend/lib/middleware'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { getUploadsRoot } from '@backend/lib/upload-paths'

const UPLOAD_DIR = join(getUploadsRoot(), 'documents')

export async function PUT(
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

    const body = await request.json()
    const { status } = body

    if (!status || !['pending', 'confirmed', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be pending, confirmed, or rejected' },
        { status: 400 }
      )
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const isAdminOrJudge = ['admin', 'judge'].includes(authResult.user.role)

    if (!isAdminOrJudge) {
      return NextResponse.json(
        { error: 'Forbidden. Only admin and judge can update document status' },
        { status: 403 }
      )
    }

    let finalStatus = status
    if (status === 'confirmed' && document.status === 'confirmed') {
      finalStatus = 'confirmed'
    } else if (status === 'confirmed') {
      finalStatus = 'confirmed'
    } else if (status === 'rejected' && document.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Cannot reject confirmed document. Status remains confirmed.' },
        { status: 400 }
      )
    } else if (status === 'pending' && document.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Cannot change status from confirmed to pending. Status remains confirmed.' },
        { status: 400 }
      )
    }

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { status: finalStatus }
    })

    return NextResponse.json(updatedDocument)
  } catch (error: any) {
    console.error('Update document status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
      where: { id: documentId }
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

    try {
      const filePath = join(UPLOAD_DIR, document.fileName)
      await unlink(filePath)
    } catch (error) {
      console.warn('File not found:', document.fileName)
    }

    await prisma.document.delete({
      where: { id: documentId }
    })

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error: any) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
