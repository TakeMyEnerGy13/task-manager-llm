import { api } from './client'

export type Priority = 'low' | 'medium' | 'high'
export type Status = 'pending' | 'in_progress' | 'done'

export interface Task {
  id: number
  title: string
  description: string | null
  priority: Priority
  status: Status
  due_date: string | null
  created_at: string
  category: string | null
  parent_id: number | null
}

export interface TaskListResponse {
  items: Task[]
  total: number
  limit: number
  offset: number
}

export interface TaskFilters {
  status?: Status[]
  priority?: Priority[]
  due_before?: string
  due_after?: string
  q?: string
  parent_id?: number
  top_level_only?: boolean
  limit?: number
  offset?: number
}

export interface TaskCreate {
  title: string
  description?: string | null
  priority?: Priority
  status?: Status
  due_date?: string | null
  category?: string | null
  parent_id?: number | null
}

export type TaskUpdate = Partial<TaskCreate>

function buildQuery(filters: TaskFilters): string {
  const params = new URLSearchParams()
  filters.status?.forEach((s) => params.append('status', s))
  filters.priority?.forEach((p) => params.append('priority', p))
  if (filters.due_before) params.set('due_before', filters.due_before)
  if (filters.due_after) params.set('due_after', filters.due_after)
  if (filters.q) params.set('q', filters.q)
  if (filters.parent_id != null) params.set('parent_id', String(filters.parent_id))
  if (filters.top_level_only) params.set('top_level_only', 'true')
  if (filters.limit != null) params.set('limit', String(filters.limit))
  if (filters.offset != null) params.set('offset', String(filters.offset))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const tasksApi = {
  list: (filters: TaskFilters = {}) =>
    api.get<TaskListResponse>(`/api/tasks${buildQuery(filters)}`),
  get: (id: number) => api.get<Task>(`/api/tasks/${id}`),
  create: (data: TaskCreate) => api.post<Task>('/api/tasks', data),
  update: (id: number, data: TaskUpdate) => api.patch<Task>(`/api/tasks/${id}`, data),
  delete: (id: number) => api.delete<void>(`/api/tasks/${id}`),
}
