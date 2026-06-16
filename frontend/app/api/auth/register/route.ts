import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { hashPassword, generateToken } from '@backend/lib/auth'
import { normalizeEmail } from '@backend/lib/normalize-email'
import {
  EMAIL_ALREADY_REGISTERED,
  findUserByNormalizedEmail,
} from '@backend/lib/user-team-rules'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fio, phone, city, organization, birthDate, role } = body

    if (!email || !password || !fio) {
      return NextResponse.json(
        { error: 'Email, password and FIO are required' },
        { status: 400 }
      )
    }

    if (role && role !== 'participant') {
      return NextResponse.json(
        { error: 'Registration with this role is not allowed' },
        { status: 403 }
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
        birthDate: birthDate ? new Date(birthDate) : null,
        role: 'participant',
        status: 'pending',
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
      }
    })

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return NextResponse.json({
      token,
      user,
    })
  } catch (error: unknown) {
    console.error('Register error:', error)
    const err = error as { code?: string }
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: EMAIL_ALREADY_REGISTERED }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
