export type TeamStage = 'qualifier' | 'final'

export function resolveTeamStage(stage: unknown): TeamStage {
  return stage === 'final' ? 'final' : 'qualifier'
}

export function teamStageLabel(stage: TeamStage): string {
  return stage === 'final' ? 'Финал' : 'Квалификация'
}

export function filterResultsByStage<T extends { stage?: string | null }>(
  results: T[],
  stage: TeamStage
): T[] {
  return results.filter((r) => (r.stage || 'qualifier') === stage)
}

export function aggregateResultTotals(results: { total?: number | null }[]) {
  if (results.length === 0) {
    return { avgScore: 0, totalScore: 0, count: 0, hasScores: false }
  }
  const totalScore = results.reduce((sum, r) => sum + (Number(r.total) || 0), 0)
  return {
    avgScore: totalScore / results.length,
    totalScore,
    count: results.length,
    hasScores: true,
  }
}

export function teamScoresForStage<T extends { stage?: string | null; total?: number | null }>(
  team: { stage?: string | null },
  results: T[]
) {
  const stage = resolveTeamStage(team.stage)
  const stageResults = filterResultsByStage(results, stage)
  const agg = aggregateResultTotals(stageResults)
  return { stage, stageResults, ...agg }
}
