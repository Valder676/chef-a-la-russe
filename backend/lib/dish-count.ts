export function qualifierDishCount(team: {
  championshipType?: string | null
  category?: string | null
}): number {
  if (team.championshipType === 'junior') return 2
  if (team.category && /юниор|junior/i.test(team.category)) return 2
  return 3
}

export function dishCountForResultStage(
  stage: 'qualifier' | 'final',
  team: { championshipType?: string | null; category?: string | null }
): number {
  if (stage === 'final') return 2
  return qualifierDishCount(team)
}

/** Число блюд на текущем этапе команды (финал — 2; квалификация — по типу команды). */
export function activeStageDishCount(team: {
  stage?: string | null
  championshipType?: string | null
  category?: string | null
}): number {
  if (team.stage === 'final') return 2
  return qualifierDishCount(team)
}
