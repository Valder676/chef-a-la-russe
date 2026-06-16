import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { hashPassword } from '@backend/lib/auth'
import { normalizeEmail } from '@backend/lib/normalize-email'
import {
  EMAIL_ALREADY_REGISTERED,
  findUserByNormalizedEmail,
} from '@backend/lib/user-team-rules'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ['admin'])
  if (authResult.error) return authResult.error

  const { id } = await params

  try {
    const body = await request.json()
    const { email, fio, phone, city, organization, role, status, password } = body

    if (email) {
      const normalizedEmail = normalizeEmail(email)
      const duplicate = await findUserByNormalizedEmail(normalizedEmail)
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: EMAIL_ALREADY_REGISTERED }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (email) updateData.email = normalizeEmail(email)
    if (fio) updateData.fio = fio
    if (phone !== undefined) updateData.phone = phone || null
    if (city !== undefined) updateData.city = city || null
    if (organization !== undefined) updateData.organization = organization || null
    if (role) updateData.role = role
    if (status) updateData.status = status
    if (password) {
      updateData.password = await hashPassword(password)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fio: true,
        phone: true,
        city: true,
        organization: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ message: 'User updated successfully', user })
  } catch (error: unknown) {
    console.error('Update user error:', error)
    const err = error as { code?: string }
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: EMAIL_ALREADY_REGISTERED }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ['admin'])
  if (authResult.error) return authResult.error

  const { id } = await params

  try {
    if (id === authResult.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
