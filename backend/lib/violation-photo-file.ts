import { access, readFile } from 'fs/promises'
import { constants } from 'fs'
import path from 'path'
import { getUploadsRoot } from '@backend/lib/upload-paths'

const PREVIEWABLE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
])

export function sanitizeViolationFileName(originalName: string): string {
  const base = path.basename(originalName || 'photo.jpg')
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
  return cleaned.length > 0 ? cleaned.slice(0, 180) : `photo-${Date.now()}.jpg`
}

export function buildStoredViolationFileName(originalName: string): string {
  return `${Date.now()}-${sanitizeViolationFileName(originalName)}`
}

export function contentTypeFromViolationFileName(fileName: string): string {
  const ext = path.extname(fileName).slice(1).toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
  }
  return map[ext] ?? 'application/octet-stream'
}

export function isPreviewableImageType(mime: string, fileName: string): boolean {
  if (PREVIEWABLE_TYPES.has(mime)) return true
  const fromName = contentTypeFromViolationFileName(fileName)
  return PREVIEWABLE_TYPES.has(fromName)
}

function violationFileNames(fileName: string): string[] {
  const rawBase = path.basename(fileName)
  if (!rawBase || rawBase === '.' || rawBase === '..') {
    throw new Error('Invalid violation photo file name')
  }
  const safeName = sanitizeViolationFileName(rawBase)
  return rawBase === safeName ? [rawBase] : [rawBase, safeName]
}

function violationUploadDirs(): string[] {
  const root = getUploadsRoot()
  const cwd = process.cwd()
  return [
    path.join(root, 'violations'),
    path.join(cwd, 'uploads', 'violations'),
    path.join(cwd, 'frontend', 'uploads', 'violations'),
    path.join(cwd, '..', 'uploads', 'violations'),
  ].map((p) => path.normalize(p))
}

function violationFileCandidates(fileName: string): string[] {
  const names = violationFileNames(fileName)
  const dirs = [...new Set(violationUploadDirs())]
  const paths: string[] = []
  for (const dir of dirs) {
    for (const name of names) {
      paths.push(path.join(dir, name))
    }
  }
  return [...new Set(paths.map((p) => path.normalize(p)))]
}

export async function resolveViolationPhotoPath(
  fileName: string
): Promise<string | null> {
  for (const filePath of violationFileCandidates(fileName)) {
    try {
      await access(filePath, constants.R_OK)
      return filePath
    } catch {}
  }
  return null
}

export async function readViolationPhotoFile(fileName: string): Promise<Buffer> {
  const filePath = await resolveViolationPhotoPath(fileName)
  if (!filePath) {
    throw new Error(`Violation photo file not found: ${fileName}`)
  }
  return readFile(filePath)
}
