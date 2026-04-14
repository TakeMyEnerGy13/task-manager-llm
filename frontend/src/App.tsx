import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import type { Task, TaskFilters } from './api/tasks'
import { DeleteDialog } from './components/DeleteDialog'
import { FilterBar } from './components/FilterBar'
import { LLMActions, WorkloadSummaryDialog } from './components/LLMActions'
import { TaskForm } from './components/TaskForm'
import { TaskList } from './components/TaskList'
import { Button } from './components/ui/Button'
import { useTasks } from './hooks/useTasks'

type LLMAction = 'categorize' | 'decompose' | 'suggest_priority'

export default function App() {
  const [filters, setFilters] = useState<TaskFilters>({ top_level_only: true })
  const { data, isLoading } = useTasks(filters)

  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [llmTask, setLlmTask] = useState<Task | null>(null)
  const [llmAction, setLlmAction] = useState<LLMAction | null>(null)
  const [workloadOpen, setWorkloadOpen] = useState(false)

  function handleEdit(task: Task) {
    setEditingTask(task)
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditingTask(null)
  }

  function handleLLMAction(task: Task, action: LLMAction) {
    setLlmTask(task)
    setLlmAction(action)
  }

  function handleLLMClose() {
    setLlmTask(null)
    setLlmAction(null)
  }

  const total = data?.total ?? 0

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Менеджер задач</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLoading ? '...' : `${total} ${pluralize(total, 'задача', 'задачи', 'задач')}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setWorkloadOpen(true)}
              title="Сводка рабочей нагрузки"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Нагрузка
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setEditingTask(null); setFormOpen(true) }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Новая задача
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-4xl px-6 py-6 space-y-4">
        <FilterBar filters={filters} onChange={setFilters} />
        <TaskList
          tasks={data?.items ?? []}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={setDeletingTask}
          onLLMAction={handleLLMAction}
        />

        {/* Pagination */}
        {data && data.total > (filters.limit ?? 100) && (
          <div className="flex justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!filters.offset}
              onClick={() => setFilters({ ...filters, offset: Math.max(0, (filters.offset ?? 0) - (filters.limit ?? 100)) })}
            >
              ← Назад
            </Button>
            <span className="text-sm text-slate-500 self-center">
              {(filters.offset ?? 0) + 1}–{Math.min((filters.offset ?? 0) + (filters.limit ?? 100), data.total)} из {data.total}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={(filters.offset ?? 0) + (filters.limit ?? 100) >= data.total}
              onClick={() => setFilters({ ...filters, offset: (filters.offset ?? 0) + (filters.limit ?? 100) })}
            >
              Вперёд →
            </Button>
          </div>
        )}
      </main>

      {/* Modals */}
      <TaskForm open={formOpen} onClose={handleFormClose} task={editingTask} />
      <DeleteDialog task={deletingTask} onClose={() => setDeletingTask(null)} />
      <LLMActions task={llmTask} action={llmAction} onClose={handleLLMClose} />
      <WorkloadSummaryDialog open={workloadOpen} onClose={() => setWorkloadOpen(false)} />
    </div>
  )
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 19) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}
