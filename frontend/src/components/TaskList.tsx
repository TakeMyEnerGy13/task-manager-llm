import type { Task } from '../api/tasks'
import { TaskCardSkeleton } from './ui/Skeleton'
import { TaskCard } from './TaskCard'

interface TaskListProps {
  tasks: Task[]
  loading: boolean
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onLLMAction: (task: Task, action: 'categorize' | 'decompose' | 'suggest_priority') => void
}

export function TaskList({ tasks, loading, onEdit, onDelete, onLLMAction }: TaskListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-slate-500 text-sm">Задач нет. Создайте первую!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onLLMAction={onLLMAction}
        />
      ))}
    </div>
  )
}
