import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { hashPassword } from '@backend/lib/auth'
import { normalizeEmail } from '@backend/lib/normalize-email'
import {
  EMAIL_ALREADY_REGISTERED,
  findUserByNormalizedEmail,
} from '@backend/lib/user-team-rules'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['admin'])
  if (authResult.error) return authResult.error

  try {
    const users = await prisma.user.findMany({
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
      },
      orderBy: {
        createdAt: 'desc',
      }
    })

    return NextResponse.json(users)
  } catch (error: any) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['admin'])
  if (authResult.error) return authResult.error

  try {
    const body = await request.json()
    const { email, password, fio, phone, city, organization, role, status } = body

    if (!email || !password || !fio || !role) {
      return NextResponse.json(
        { error: 'Email, password, FIO and role are required' },
        { status: 400 }
      )
    }

    const allowedRoles = ['participant', 'judge', 'admin']
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}` },
        { status: 400 }
      )
    }

    const normalizedEmail = normalizeEmail(email)
    const existingUser = await findUserByNormalizedEmail(normalizedEmail)

    if (existingUser) {
      return NextResponse.json({ error: EMAIL_ALREADY_REGISTERED }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        fio,
        phone: phone || null,
        city: city || null,
        organization: organization || null,
        role,
        status: status || 'pending',
      },
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
      }
    })

    return NextResponse.json({
      message: 'User created successfully',
      user,
    })
  } catch (error: unknown) {
    console.error('Create user error:', error)
    const err = error as { code?: string }
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: EMAIL_ALREADY_REGISTERED }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
