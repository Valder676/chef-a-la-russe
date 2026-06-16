/** Роли API — соответствуют разделам интерфейса (судья / админ). */

export const JUDGE_WRITE = ['judge'] as const

export const JUDGE_ADMIN_READ = ['judge', 'admin'] as const

export const ADMIN_ONLY = ['admin'] as const

export const VIOLATION_PHOTO_VIEW = ['judge', 'participant'] as const
