import { clsx } from 'clsx'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Task } from '../api/tasks'
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from '../lib/constants'
import { Button } from './ui/Button'

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onLLMAction?: (task: Task, action: 'categorize' | 'decompose' | 'suggest_priority') => void
}

export function TaskCard({ task, onEdit, onDelete, onLLMAction }: TaskCardProps) {
  const isOverdue =
    task.due_date &&
    task.status !== 'done' &&
    new Date(task.due_date) < new Date()

  return (
    <div
      className={clsx(
        'rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
        isOverdue ? 'border-red-200' : 'border-slate-200',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-900 truncate">{task.title}</h3>
          {task.description && (
            <p className="mt-1 text-sm text-slate-500 line-clamp-2">{task.description}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => onEdit(task)} title="Редактировать">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(task)} title="Удалить"
            className="hover:bg-red-50 hover:text-red-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[task.status])}>
          {STATUS_LABELS[task.status]}
        </span>
        <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_COLORS[task.priority])}>
          {PRIORITY_LABELS[task.priority]}
        </span>
        {task.category && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
            {task.category}
          </span>
        )}
        {task.due_date && (
          <span className={clsx('text-xs', isOverdue ? 'text-red-600 font-medium' : 'text-slate-500')}>
            {isOverdue ? '⚠ просрочено: ' : ''}
            {format(new Date(task.due_date), 'd MMM yyyy', { locale: ru })}
          </span>
        )}
      </div>

      {onLLMAction && task.status !== 'done' && (
        <div className="mt-3 flex gap-1 border-t border-slate-100 pt-3">
          <button
            onClick={() => onLLMAction(task, 'categorize')}
            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
            title="Автоматическая категоризация"
          >
            Категория
          </button>
          <span className="text-slate-300">·</span>
          <button
            onClick={() => onLLMAction(task, 'decompose')}
            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
            title="Разбить на подзадачи"
          >
            Декомпозиция
          </button>
          <span className="text-slate-300">·</span>
          <button
            onClick={() => onLLMAction(task, 'suggest_priority')}
            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
            title="Предложить приоритет"
          >
            Приоритет
          </button>
        </div>
      )}
    </div>
  )
}
