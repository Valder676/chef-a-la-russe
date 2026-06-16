export interface User {
  id: string
  email: string
  fio: string
  phone?: string
  city?: string
  organization?: string
  birthDate?: string
  role: 'participant' | 'judge' | 'admin'
  status: 'pending' | 'confirmed' | 'rejected'
  createdAt?: string
  updatedAt?: string
}

export interface Team {
  id: string
  name: string
  category: string
  championshipType?: 'adult' | 'junior'
  status: 'pending' | 'confirmed'
  stage?: 'qualifier' | 'final'
  resultsPublished?: boolean
  members: TeamMember[]
}

export interface TeamMember {
  id: string
  userId: string
  teamId: string
  status: 'pending' | 'confirmed'
  user: User
}

export interface Document {
  id: string
  userId: string
  name: string
  documentType?: string
  fileName: string
  fileSize: number
  status: 'pending' | 'confirmed' | 'rejected'
  createdAt: string
}

export interface Upload {
  id: string
  teamId: string
  userId: string
  dishNumber: number
  fileType: 'photo' | 'techCard' | 'menu'
  fileName: string
  fileSize: number
  status: 'pending' | 'confirmed'
  createdAt: string
}

export interface UploadWithUser extends Upload {
  user: { id: string; fio: string; email: string }
}

export interface ViolationPhoto {
  id: string
  resultId: string
  criterionKey: string
  fileName: string
  fileSize: number
  createdAt: string
}

export interface Result {
  id: string
  teamId: string
  judgeId: string
  dishNumber: number
  stage?: 'qualifier' | 'final'
  status?: 'draft' | 'fixed'
  miseEnPlace: number
  hygieneWaste: number
  professionalPrep: number
  innovation: number
  service: number
  presentation: number
  tasteTexture: number
  penalties: number
  total: number
  violationPhotos?: ViolationPhoto[]
}

function getToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || ''
  }
  return ''
}

function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token)
  }
}

function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token')
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'Internal server error'
    try {
      const data = await response.json()
      errorMessage = data.error || errorMessage
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }
  
  try {
    const data = await response.json()
    return data
  } catch (error) {
    throw new Error('Invalid response format')
  }
}

export const api = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await handleResponse<{ token: string; user: User }>(response)
    setToken(data.token)
    return data
  },

  async register(data: {
    email: string
    password: string
    fio: string
    phone?: string
    city?: string
    organization?: string
    birthDate?: string
  }): Promise<{ token: string; user: User }> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await handleResponse<{ token: string; user: User }>(response)
    setToken(result.token)
    return result
  },

  logout(): void {
    removeToken()
  },

  async getProfile(): Promise<User> {
    const response = await fetch('/api/profile', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<User>(response)
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    })
    return handleResponse<User>(response)
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch('/api/profile/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    await handleResponse<void>(response)
  },

  async getTeam(): Promise<Team> {
    const response = await fetch('/api/team', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<Team>(response)
  },

  async getDocuments(): Promise<Document[]> {
    const response = await fetch('/api/documents', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<Document[]>(response)
  },

  async uploadDocument(file: File, documentType: string): Promise<Document> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentType', documentType)
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    })
    return handleResponse<Document>(response)
  },

  async updateDocumentStatus(id: string, status: 'pending' | 'confirmed' | 'rejected'): Promise<Document> {
    const response = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ status }),
    })
    return handleResponse<Document>(response)
  },

  async deleteDocument(id: string): Promise<void> {
    const response = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    await handleResponse<void>(response)
  },

  async getUploads(): Promise<Upload[]> {
    const response = await fetch('/api/uploads', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<Upload[]>(response)
  },

  async uploadFile(
    dishNumber: number,
    fileType: 'photo' | 'techCard' | 'menu',
    file: File
  ): Promise<Upload> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('dishNumber', dishNumber.toString())
    formData.append('fileType', fileType)
    const response = await fetch('/api/uploads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    })
    return handleResponse<Upload>(response)
  },

  async deleteUpload(uploadId: string): Promise<void> {
    const response = await fetch(`/api/uploads/${uploadId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    await handleResponse<void>(response)
  },

  async getTeamDishUploads(teamId: string): Promise<UploadWithUser[]> {
    const response = await fetch(`/api/judge/teams/${teamId}/uploads`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<UploadWithUser[]>(response)
  },

  async getJudgeUploads(userId?: string): Promise<UploadWithUser[]> {
    const url = userId ? `/api/judge/uploads?userId=${userId}` : '/api/judge/uploads'
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<UploadWithUser[]>(response)
  },

  async getResults(): Promise<Result[]> {
    const response = await fetch('/api/results', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<Result[]>(response)
  },

  async getJudgeParticipants(): Promise<User[]> {
    const response = await fetch('/api/judge/participants', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<User[]>(response)
  },

  async updateParticipantStatus(userId: string, status: string): Promise<User> {
    const response = await fetch('/api/judge/participants', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ userId, status }),
    })
    return handleResponse<User>(response)
  },

  async getJudgeTeams(): Promise<any[]> {
    const response = await fetch('/api/judge/teams', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<any[]>(response)
  },

  async createTeam(data: {
    name: string
    category: string
    championshipType?: 'adult' | 'junior'
    userIds?: string[]
  }): Promise<Team> {
    const response = await fetch('/api/judge/teams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    })
    return handleResponse<Team>(response)
  },

  async getJudgeTeam(teamId: string): Promise<any> {
    const response = await fetch(`/api/judge/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<any>(response)
  },

  async updateJudgeTeam(
    teamId: string,
    data: {
      name?: string
      category?: string
      championshipType?: 'adult' | 'junior'
    }
  ): Promise<any> {
    const response = await fetch(`/api/judge/teams/${teamId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    })
    return handleResponse<any>(response)
  },

  async deleteJudgeTeam(teamId: string): Promise<void> {
    const response = await fetch(`/api/judge/teams/${teamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    await handleResponse<void>(response)
  },

  async publishTeamResults(teamId: string, published: boolean): Promise<any> {
    const response = await fetch(`/api/judge/teams/${teamId}/publish`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ resultsPublished: published }),
    })
    return handleResponse<any>(response)
  },

  async updateTeamStage(teamId: string, stage: 'qualifier' | 'final'): Promise<any> {
    const response = await fetch(`/api/judge/teams/${teamId}/stage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ stage }),
    })
    return handleResponse<any>(response)
  },

  async updateTeamStatus(teamId: string, status: string): Promise<any> {
    const response = await fetch('/api/judge/teams', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ teamId, status }),
    })
    return handleResponse<any>(response)
  },

  async getJudgeResults(): Promise<any[]> {
    const response = await fetch('/api/judge/results', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<any[]>(response)
  },

  async getJudges(): Promise<User[]> {
    const response = await fetch('/api/judge/judges', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<User[]>(response)
  },

  async getJudgeResultsByStage(
    teamId: string,
    judgeId: string,
    stage: 'qualifier' | 'final'
  ): Promise<Result[]> {
    const response = await fetch(
      `/api/judge/teams/${teamId}/judges/${judgeId}?stage=${stage}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    return handleResponse<Result[]>(response)
  },

  async saveJudgeResult(
    teamId: string,
    judgeId: string,
    data: {
      dishNumber: number
      stage?: 'qualifier' | 'final'
      miseEnPlace: number
      hygieneWaste: number
      professionalPrep: number
      innovation: number
      service: number
      presentation: number
      tasteTexture: number
      penalties?: number
    }
  ): Promise<Result> {
    const response = await fetch(`/api/judge/teams/${teamId}/judges/${judgeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    })
    return handleResponse<Result>(response)
  },

  async getAllUsers(): Promise<User[]> {
    const response = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<User[]>(response)
  },

  async getAdminStatistics(): Promise<{
    totalUsers: number
    totalTeams: number
    totalResults: number
    usersByRole: { participant: number; judge: number; admin: number }
    usersByStatus: { confirmed: number; pending: number; rejected: number }
    teamsByStatus: { confirmed: number; pending: number }
    teamsByCategory: Record<string, number>
    avgTeamScore: string
    topTeams: Array<{ id: string; name: string; category: string; avgScore: number; stage?: string }>
  }> {
    const response = await fetch('/api/admin/statistics', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse(response)
  },

  async createUser(data: {
    email: string
    password: string
    fio: string
    phone?: string
    city?: string
    organization?: string
    role: 'participant' | 'judge' | 'admin'
    status?: 'pending' | 'confirmed'
  }): Promise<User> {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    })
    return handleResponse<User>(response)
  },

  async updateUser(
    userId: string,
    data: {
      email?: string
      fio?: string
      phone?: string
      city?: string
      organization?: string
      role?: 'participant' | 'judge' | 'admin'
      status?: 'pending' | 'confirmed'
      password?: string
    }
  ): Promise<User> {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    })
    return handleResponse<User>(response)
  },

  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    await handleResponse<void>(response)
  },

  async addTeamMember(teamId: string, userId: string): Promise<TeamMember> {
    const response = await fetch(`/api/judge/teams/${teamId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ userId }),
    })
    return handleResponse<TeamMember>(response)
  },

  async removeTeamMember(teamId: string, memberId: string): Promise<void> {
    const response = await fetch(`/api/judge/teams/${teamId}/members?memberId=${memberId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    await handleResponse<void>(response)
  },

  async getParticipantDocuments(
    userId?: string,
    teamId?: string
  ): Promise<(Document & { user: { id: string; fio: string; email: string } })[]> {
    const params = new URLSearchParams()
    if (userId) params.set('userId', userId)
    if (teamId) params.set('teamId', teamId)
    const q = params.toString()
    const url = q ? `/api/judge/documents?${q}` : '/api/judge/documents'
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return handleResponse<(Document & { user: { id: string; fio: string; email: string } })[]>(response)
  },

  async uploadViolationPhoto(resultId: string, criterionKey: string, file: File): Promise<ViolationPhoto> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('resultId', resultId)
    formData.append('criterionKey', criterionKey)

    const response = await fetch('/api/judge/violation-photos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    })
    return handleResponse<ViolationPhoto>(response)
  },

  async deleteViolationPhoto(photoId: string): Promise<void> {
    const response = await fetch(`/api/judge/violation-photos?id=${photoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    await handleResponse<void>(response)
  },

  async fixResultSheet(teamId: string, judgeId: string, stage?: 'qualifier' | 'final'): Promise<void> {
    const url = stage
      ? `/api/judge/teams/${teamId}/judges/${judgeId}/fix?stage=${stage}`
      : `/api/judge/teams/${teamId}/judges/${judgeId}/fix`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    })
    await handleResponse<void>(response)
  },

  async unfixResultSheet(teamId: string, judgeId: string, stage?: 'qualifier' | 'final'): Promise<void> {
    const url = stage
      ? `/api/judge/teams/${teamId}/judges/${judgeId}/unfix?stage=${stage}`
      : `/api/judge/teams/${teamId}/judges/${judgeId}/unfix`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    })
    await handleResponse<void>(response)
  },
}

export { getToken, setToken, removeToken }
