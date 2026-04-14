import { type FormEvent, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { Task, TaskCreate, TaskUpdate } from '../api/tasks'
import { useCreateTask, useUpdateTask } from '../hooks/useTasks'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { Input } from './ui/Input'
import { Select } from './ui/Select'

interface TaskFormProps {
  open: boolean
  onClose: () => void
  task?: Task | null
}

const empty: TaskCreate = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'pending',
  due_date: null,
}

export function TaskForm({ open, onClose, task }: TaskFormProps) {
  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask()
  const isEdit = !!task

  const [form, setForm] = useState<TaskCreate>(empty)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        status: task.status,
        due_date: task.due_date ?? null,
      })
    } else {
      setForm(empty)
    }
    setFieldErrors({})
  }, [task, open])

  const isPending = createMutation.isPending || updateMutation.isPending

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})

    const payload = {
      ...form,
      description: form.description || null,
      due_date: form.due_date || null,
    }

    try {
      if (isEdit && task) {
        await updateMutation.mutateAsync({ id: task.id, data: payload as TaskUpdate })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onClose()
    } catch (err: unknown) {
      const apiErr = err instanceof Error ? err : null
      const details = apiErr && 'details' in apiErr ? (apiErr as { details?: Record<string, string> }).details : undefined
      if (details) {
        const errs: Record<string, string> = {}
        for (const [k, v] of Object.entries(details)) {
          errs[k.replace('body.', '')] = String(v)
        }
        setFieldErrors(errs)
      } else {
        toast.error(apiErr?.message ?? 'Ошибка сохранения')
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? 'Редактировать задачу' : 'Новая задача'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="title"
          label="Название *"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          error={fieldErrors['title']}
          placeholder="Что нужно сделать?"
          required
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-slate-700">
            Описание
          </label>
          <textarea
            id="description"
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Подробности..."
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            id="priority"
            label="Приоритет"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
          >
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
          </Select>
          <Select
            id="status"
            label="Статус"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as any })}
          >
            <option value="pending">Ожидает</option>
            <option value="in_progress">В работе</option>
            <option value="done">Готово</option>
          </Select>
        </div>
        <Input
          id="due_date"
          label="Срок выполнения"
          type="date"
          value={form.due_date ?? ''}
          onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" loading={isPending}>
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
