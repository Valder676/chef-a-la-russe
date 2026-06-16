import { NextRequest, NextResponse } from 'next/server'
import { loginWithEmailPassword } from '@backend/services/auth.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const result = await loginWithEmailPassword(email, password)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    return NextResponse.json({
      token: result.token,
      user: result.user,
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
