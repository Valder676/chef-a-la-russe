import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@backend/lib/prisma'
import { requireRole } from '@backend/lib/middleware'
import { JUDGE_WRITE } from '@backend/lib/route-roles'
import { dishCountForResultStage } from '@backend/lib/dish-count'

const LIMITS = {
  miseEnPlace: [0, 5] as const,
  hygieneWaste: [0, 10] as const,
  professionalPrep: [0, 15] as const,
  innovation: [0, 5] as const,
  service: [0, 5] as const,
  presentation: [0, 10] as const,
  tasteTexture: [0, 50] as const,
}

type Key = keyof typeof LIMITS

function inRange(v: number, key: Key) {
  const [min, max] = LIMITS[key]
  return v >= min && v <= max
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; judgeId: string }> | { id: string; judgeId: string } }
) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
  if (authResult.error) return authResult.error

  try {
    const { id: teamId, judgeId } = await Promise.resolve(params)

    const { searchParams } = new URL(request.url)
    const stage = (searchParams.get('stage') as 'qualifier' | 'final') || 'qualifier'

    const results = await prisma.result.findMany({
      where: {
        teamId,
        judgeId,
        stage,
      },
      include: {
        violationPhotos: true,
      },
      orderBy: {
        dishNumber: 'asc',
      },
    })

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Get judge results error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; judgeId: string }> | { id: string; judgeId: string } }
) {
  const authResult = await requireRole(request, [...JUDGE_WRITE])
  if (authResult.error) return authResult.error

  try {
    const { id: teamId, judgeId } = await Promise.resolve(params)
    const requester = authResult.user
    if (requester.id !== judgeId) {
      return NextResponse.json(
        { error: 'Forbidden: можно редактировать только свой лист' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      dishNumber,
      miseEnPlace,
      hygieneWaste,
      professionalPrep,
      innovation,
      service,
      presentation,
      tasteTexture,
      penalties,
      stage,
    } = body
    const stageVal: 'qualifier' | 'final' = ['qualifier', 'final'].includes(stage) ? stage : 'qualifier'

    const dishNum = parseInt(dishNumber, 10)
    const vals = {
      miseEnPlace: Number(miseEnPlace),
      hygieneWaste: Number(hygieneWaste),
      professionalPrep: Number(professionalPrep),
      innovation: Number(innovation),
      service: Number(service),
      presentation: Number(presentation),
      tasteTexture: Number(tasteTexture),
    }
    const penaltiesVal = Number(penalties) || 0

    if (!dishNum || Object.values(vals).some((v) => isNaN(v))) {
      return NextResponse.json({ error: 'All score fields are required' }, { status: 400 })
    }

    for (const key of Object.keys(LIMITS) as Key[]) {
      if (!inRange(vals[key], key)) {
        return NextResponse.json(
          { error: `Недопустимое значение для критерия (${key})` },
          { status: 400 }
        )
      }
    }
    if (penaltiesVal < 0) {
      return NextResponse.json({ error: 'Штраф не может быть отрицательным' }, { status: 400 })
    }

    const teamData = await prisma.team.findUnique({
      where: { id: teamId },
      select: { category: true, championshipType: true },
    })
    if (!teamData) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }
    const dishCount = dishCountForResultStage(stageVal, teamData)
    if (dishNum < 1 || dishNum > dishCount) {
      return NextResponse.json(
        { error: `dishNumber must be 1..${dishCount}` },
        { status: 400 }
      )
    }

    const raw =
      vals.miseEnPlace +
      vals.hygieneWaste +
      vals.professionalPrep +
      vals.innovation +
      vals.service +
      vals.presentation +
      vals.tasteTexture
    const total = Math.max(0, Math.min(100, raw - penaltiesVal))

    const existing = await prisma.result.findFirst({
      where: { teamId, judgeId, dishNumber: dishNum, stage: stageVal },
      select: { id: true },
    })

    const hasFixedSheet = await prisma.result.findFirst({
      where: { teamId, judgeId, stage: stageVal, status: 'fixed' },
      select: { id: true },
    })
    if (hasFixedSheet) {
      return NextResponse.json(
        { error: 'Result sheet is fixed and cannot be edited' },
        { status: 400 }
      )
    }

    const data = {
      ...vals,
      penalties: penaltiesVal,
      total,
      status: 'draft' as const,
      stage: stageVal,
    }

    const result = existing
      ? await prisma.result.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.result.create({
          data: {
            teamId,
            judgeId,
            dishNumber: dishNum,
            ...data,
          },
        })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Create/update result error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
