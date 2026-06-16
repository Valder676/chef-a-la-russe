import type { PrismaClient } from '@prisma/client'

/** Доступ к загрузкам команды: участник, судья с листом по команде, админ. */
export async function canAccessTeamUploadContent(
  prisma: PrismaClient,
  user: { id: string; role: string },
  teamId: string
): Promise<boolean> {
  if (['admin', 'judge'].includes(user.role)) return true
  const member = await prisma.teamMember.findFirst({
    where: { userId: user.id, teamId },
  })
  if (member) return true
  const judging = await prisma.result.findFirst({
    where: { teamId, judgeId: user.id },
  })
  return !!judging
}
