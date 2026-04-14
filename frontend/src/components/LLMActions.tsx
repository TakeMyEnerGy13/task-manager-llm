import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { llmApi } from '../api/llm'
import type { SubtaskProposal } from '../api/llm'
import type { Priority, Task, TaskCreate } from '../api/tasks'
import { useCreateTask, useUpdateTask } from '../hooks/useTasks'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'

type LLMAction = 'categorize' | 'decompose' | 'suggest_priority'

interface LLMActionsProps {
  task: Task | null
  action: LLMAction | null
  onClose: () => void
}

export function LLMActions({ task, action, onClose }: LLMActionsProps) {
  return (
    <>
      {action === 'categorize' && task && (
        <CategorizeDialog task={task} onClose={onClose} />
      )}
      {action === 'decompose' && task && (
        <DecomposeDialog task={task} onClose={onClose} />
      )}
      {action === 'suggest_priority' && task && (
        <SuggestPriorityDialog task={task} onClose={onClose} />
      )}
    </>
  )
}

// --- Categorize ---

function CategorizeDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<{ category: string; tags: string[]; confidence: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const updateTask = useUpdateTask()

  useEffect(() => {
    let cancelled = false
    llmApi
      .categorize(task.title, task.description)
      .then((r) => { if (!cancelled) setResult(r) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [task.id])

  async function handleApply() {
    if (!result) return
    await updateTask.mutateAsync({ id: task.id, data: { category: result.category } })
    toast.success(`Категория «${result.category}» применена`)
    onClose()
  }

  return (
    <Dialog open title="Умная категоризация" onClose={onClose}>
      {loading && <p className="text-sm text-slate-500 py-4 text-center">Анализирую задачу...</p>}
      {error && (
        <div className="space-y-4">
          <p className="text-sm text-red-600">{error}</p>
          <div className="flex justify-end"><Button onClick={onClose}>Закрыть</Button></div>
        </div>
      )}
      {result && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Предложенная категория</p>
            <p className="text-lg font-semibold text-indigo-700">{result.category}</p>
          </div>
          {result.tags.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1.5">Теги</p>
              <div className="flex flex-wrap gap-1">
                {result.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-slate-400">
            Уверенность: {Math.round(result.confidence * 100)}%
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Отклонить</Button>
            <Button variant="primary" loading={updateTask.isPending} onClick={handleApply}>
              Применить
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

// --- Decompose ---

function DecomposeDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [edited, setEdited] = useState<SubtaskProposal[]>([])
  const [error, setError] = useState<string | null>(null)
  const createTask = useCreateTask()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    llmApi
      .decompose(task.title, task.description)
      .then((res) => { if (!cancelled) setEdited(res.subtasks.map((s) => ({ ...s }))) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [task.id])

  async function handleCreateAll() {
    setSaving(true)
    try {
      for (const s of edited) {
        const payload: TaskCreate = {
          title: s.title,
          description: s.description ?? null,
          priority: task.priority,
          status: 'pending',
          parent_id: task.id,
        }
        await createTask.mutateAsync(payload)
      }
      toast.success(`Создано ${edited.length} подзадач`)
      onClose()
    } catch {
      // errors handled in mutation
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open title="Декомпозиция задачи" onClose={onClose}>
      {loading && <p className="text-sm text-slate-500 py-4 text-center">Разбиваю на подзадачи...</p>}
      {error && (
        <div className="space-y-4">
          <p className="text-sm text-red-600">{error}</p>
          <div className="flex justify-end"><Button onClick={onClose}>Закрыть</Button></div>
        </div>
      )}
      {!loading && !error && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Вы можете отредактировать предложенные подзадачи:</p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {edited.map((s, i) => (
              <input
                key={i}
                value={s.title}
                onChange={(e) => {
                  const next = [...edited]
                  next[i] = { ...next[i], title: e.target.value }
                  setEdited(next)
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                  focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Отмена</Button>
            <Button variant="primary" loading={saving} onClick={handleCreateAll}
              disabled={edited.some((s) => !s.title.trim())}>
              Создать все ({edited.length})
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

// --- Suggest priority ---

function SuggestPriorityDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<{ priority: string; rationale: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const updateTask = useUpdateTask()

  const LABELS: Record<string, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий' }

  useEffect(() => {
    let cancelled = false
    llmApi
      .suggestPriority(task.title, task.description, task.due_date)
      .then((r) => { if (!cancelled) setResult(r) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [task.id])

  async function handleApply() {
    if (!result) return
    await updateTask.mutateAsync({ id: task.id, data: { priority: result.priority as Priority } })
    toast.success(`Приоритет «${LABELS[result.priority]}» применён`)
    onClose()
  }

  return (
    <Dialog open title="Предложение приоритета" onClose={onClose}>
      {loading && <p className="text-sm text-slate-500 py-4 text-center">Анализирую задачу...</p>}
      {error && (
        <div className="space-y-4">
          <p className="text-sm text-red-600">{error}</p>
          <div className="flex justify-end"><Button onClick={onClose}>Закрыть</Button></div>
        </div>
      )}
      {result && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Рекомендуемый приоритет</p>
            <p className="text-lg font-semibold text-indigo-700">{LABELS[result.priority]}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Обоснование</p>
            <p className="text-sm text-slate-600">{result.rationale}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Отклонить</Button>
            <Button variant="primary" loading={updateTask.isPending} onClick={handleApply}>
              Применить
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

// --- Workload summary (standalone) ---

interface WorkloadDialogProps {
  open: boolean
  onClose: () => void
}

export function WorkloadSummaryDialog({ open, onClose }: WorkloadDialogProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ summary: string; overdue_count: number; upcoming_count: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setResult(null)
    setError(null)
    llmApi
      .workloadSummary()
      .then((r) => { if (!cancelled) setResult(r) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open])

  return (
    <Dialog open={open} title="Сводка нагрузки" onClose={onClose}>
      {loading && <p className="text-sm text-slate-500 py-4 text-center">Анализирую задачи...</p>}
      {error && (
        <div className="space-y-4">
          <p className="text-sm text-red-600">{error}</p>
          <div className="flex justify-end"><Button onClick={onClose}>Закрыть</Button></div>
        </div>
      )}
      {result && (
        <div className="space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{result.overdue_count}</p>
              <p className="text-xs text-slate-500">просрочено</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{result.upcoming_count}</p>
              <p className="text-xs text-slate-500">скоро</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Закрыть</Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
