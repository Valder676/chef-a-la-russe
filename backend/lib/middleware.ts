import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from './auth'
import { prisma } from './prisma'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: string
  }
}

export async function requireAuth(request: NextRequest): Promise<{ user: any; error: null } | { user: null; error: NextResponse }> {
  const token = getTokenFromRequest(request)

  if (!token) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const payload = verifyToken(token)
  if (!payload) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
    },
  })

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'User not found' }, { status: 401 }),
    }
  }

  return { user, error: null }
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<{ user: any; error: null } | { user: null; error: NextResponse }> {
  const authResult = await requireAuth(request)

  if (authResult.error) {
    return authResult
  }

  if (!allowedRoles.includes(authResult.user.role)) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return authResult
}
