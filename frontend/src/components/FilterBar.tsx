import { useEffect, useState } from 'react'
import type { Priority, Status, TaskFilters } from '../api/tasks'
import { PRIORITY_LABELS, STATUS_LABELS } from '../lib/constants'

interface FilterBarProps {
  filters: TaskFilters
  onChange: (filters: TaskFilters) => void
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [search, setSearch] = useState(filters.q ?? '')

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      onChange({ ...filters, q: search || undefined, offset: 0 })
    }, 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function toggleStatus(s: Status) {
    const current = filters.status ?? []
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s]
    onChange({ ...filters, status: next.length ? next : undefined, offset: 0 })
  }

  function togglePriority(p: Priority) {
    const current = filters.priority ?? []
    const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p]
    onChange({ ...filters, priority: next.length ? next : undefined, offset: 0 })
  }

  function clearAll() {
    setSearch('')
    onChange({})
  }

  const hasFilters =
    search ||
    (filters.status?.length ?? 0) > 0 ||
    (filters.priority?.length ?? 0) > 0 ||
    filters.due_before ||
    filters.due_after

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Поиск по названию и описанию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm
            focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        {/* Status */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Статус</p>
          <div className="flex gap-1">
            {(['pending', 'in_progress', 'done'] as Status[]).map((s) => {
              const active = filters.status?.includes(s)
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors
                    ${active
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 text-slate-600 hover:border-indigo-400'
                    }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Priority */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Приоритет</p>
          <div className="flex gap-1">
            {(['low', 'medium', 'high'] as Priority[]).map((p) => {
              const active = filters.priority?.includes(p)
              return (
                <button
                  key={p}
                  onClick={() => togglePriority(p)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors
                    ${active
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 text-slate-600 hover:border-indigo-400'
                    }`}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Due date range */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Срок</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.due_after ?? ''}
              onChange={(e) => onChange({ ...filters, due_after: e.target.value || undefined, offset: 0 })}
              className="rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-slate-400 text-xs">—</span>
            <input
              type="date"
              value={filters.due_before ?? ''}
              onChange={(e) => onChange({ ...filters, due_before: e.target.value || undefined, offset: 0 })}
              className="rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-indigo-600 hover:underline ml-auto">
            Сбросить
          </button>
        )}
      </div>
    </div>
  )
}
