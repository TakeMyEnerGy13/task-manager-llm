import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { tasksApi } from '../api/tasks'
import type { TaskCreate, TaskFilters, TaskUpdate } from '../api/tasks'
import type { ApiError } from '../api/client'

export const TASKS_KEY = 'tasks'

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: [TASKS_KEY, filters],
    queryFn: () => tasksApi.list(filters),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskCreate) => tasksApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TASKS_KEY] })
      toast.success('Задача создана')
    },
    onError: (err: ApiError) => toast.error(err.message),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaskUpdate }) =>
      tasksApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TASKS_KEY] })
      toast.success('Задача обновлена')
    },
    onError: (err: ApiError) => toast.error(err.message),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TASKS_KEY] })
      toast.success('Задача удалена')
    },
    onError: (err: ApiError) => toast.error(err.message),
  })
}
