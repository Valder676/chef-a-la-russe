import path from 'path'

export function getUploadsRoot(): string {
  if (process.env.UPLOADS_ROOT) {
    return process.env.UPLOADS_ROOT
  }
  const cwd = process.cwd()
  if (path.basename(cwd) === 'frontend') {
    return path.join(cwd, '..', 'uploads')
  }
  return path.join(cwd, 'uploads')
}
