import { api } from './client'

export interface CategorizeResponse {
  category: string
  tags: string[]
  confidence: number
}

export interface SubtaskProposal {
  title: string
  description?: string | null
}

export interface DecomposeResponse {
  subtasks: SubtaskProposal[]
}

export interface SuggestPriorityResponse {
  priority: 'low' | 'medium' | 'high'
  rationale: string
}

export interface WorkloadSummaryResponse {
  summary: string
  overdue_count: number
  upcoming_count: number
}

export const llmApi = {
  categorize: (title: string, description?: string | null) =>
    api.post<CategorizeResponse>('/api/llm/categorize', { title, description }),

  decompose: (title: string, description?: string | null) =>
    api.post<DecomposeResponse>('/api/llm/decompose', { title, description }),

  suggestPriority: (title: string, description?: string | null, due_date?: string | null) =>
    api.post<SuggestPriorityResponse>('/api/llm/suggest-priority', {
      title,
      description,
      due_date,
    }),

  workloadSummary: () => api.post<WorkloadSummaryResponse>('/api/llm/workload-summary', {}),
}
