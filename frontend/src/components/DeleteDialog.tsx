import type { Task } from '../api/tasks'
import { useDeleteTask } from '../hooks/useTasks'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'

interface DeleteDialogProps {
  task: Task | null
  onClose: () => void
}

export function DeleteDialog({ task, onClose }: DeleteDialogProps) {
  const mutation = useDeleteTask()

  async function handleDelete() {
    if (!task) return
    await mutation.mutateAsync(task.id)
    onClose()
  }

  return (
    <Dialog open={!!task} onClose={onClose} title="Удалить задачу">
      <p className="text-sm text-slate-600 mb-6">
        Удалить <span className="font-medium text-slate-900">«{task?.title}»</span>?
        {task && !task.parent_id && (
          <span className="block mt-1 text-xs text-red-600">
            Все подзадачи будут удалены вместе с ней.
          </span>
        )}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="danger" loading={mutation.isPending} onClick={handleDelete}>
          Удалить
        </Button>
      </div>
    </Dialog>
  )
}
