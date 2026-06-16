import { prisma } from './prisma'

export const EMAIL_ALREADY_REGISTERED =
  'Пользователь с таким email уже зарегистрирован. Войдите в существующий аккаунт или восстановите доступ.'

export function formatUserAlreadyInTeam(teamName: string): string {
  return `Участник уже состоит в команде «${teamName}». Сначала удалите его из прежней команды.`
}

export async function findUserByNormalizedEmail(normalizedEmail: string) {
  return prisma.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: 'insensitive' },
    },
  })
}

export async function getUserTeamConflict(userId: string, allowTeamId?: string) {
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    include: { team: { select: { id: true, name: true } } },
  })
  if (!membership) return null
  if (allowTeamId && membership.teamId === allowTeamId) return null
  return membership
}

export async function validateUsersForTeamAdd(userIds: string[], allowTeamId?: string) {
  for (const userId of userIds) {
    const conflict = await getUserTeamConflict(userId, allowTeamId)
    if (conflict) {
      return { ok: false as const, error: formatUserAlreadyInTeam(conflict.team.name) }
    }
  }
  return { ok: true as const }
}
