import { Result, ViolationPhoto } from '@/lib/api'

export const MAX_VIOLATION_PHOTOS_PER_DISH = 5

export type ViolationCriterionKey =
  | 'miseEnPlace'
  | 'hygieneWaste'
  | 'professionalPrep'
  | 'innovation'
  | 'service'
  | 'presentation'
  | 'tasteTexture'

export function dishPhotoKey(criterionKey: string, dishNumber: number) {
  return `${criterionKey}:${dishNumber}`
}

export function dedupeViolationPhotos(photos: ViolationPhoto[] | undefined): ViolationPhoto[] {
  if (!photos?.length) return []
  const seen = new Set<string>()
  const unique: ViolationPhoto[] = []
  for (const p of photos) {
    if (!p?.id || seen.has(p.id)) continue
    seen.add(p.id)
    unique.push(p)
  }
  return unique.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}

export function resultsToByDish(stageResults: Result[]): Record<number, Result> {
  const byDish: Record<number, Result> = {}
  for (const r of stageResults) {
    byDish[r.dishNumber] = {
      ...r,
      violationPhotos: dedupeViolationPhotos(r.violationPhotos),
    }
  }
  return byDish
}

export function buildPhotosIndex(
  byDish: Record<number, Result>
): Record<string, ViolationPhoto[]> {
  const index: Record<string, ViolationPhoto[]> = {}
  for (const r of Object.values(byDish)) {
    if (!r?.violationPhotos?.length) continue
    for (const photo of r.violationPhotos) {
      const key = dishPhotoKey(photo.criterionKey, r.dishNumber)
      if (!index[key]) index[key] = []
      const list = index[key]
      if (!list.some((p) => p.id === photo.id)) {
        list.push(photo)
      }
    }
  }
  for (const key of Object.keys(index)) {
    index[key] = dedupeViolationPhotos(index[key])
  }
  return index
}

export function getPhotosFromIndex(
  index: Record<string, ViolationPhoto[]>,
  criterionKey: ViolationCriterionKey,
  dishNumber: number
): ViolationPhoto[] {
  return index[dishPhotoKey(criterionKey, dishNumber)] ?? []
}
