import api from './index'

export interface CleaningTask {
  id: number
  machineId: string
  status: string
  cleanerId?: number | null
  startedAt?: string | null
  completedAt?: string | null
  duration?: number | null
  createdAt?: string | null
}

export const cleaningApi = {
  getPendingTasks() {
    return api.get<CleaningTask[]>('/cleaning/tasks/pending')
  },
  getCompletedTasks() {
    return api.get<CleaningTask[]>('/cleaning/tasks/completed')
  },
  startCleaning(id: number) {
    return api.post<CleaningTask>(`/cleaning/tasks/${id}/start`)
  },
  completeCleaning(id: number) {
    return api.post<CleaningTask>(`/cleaning/tasks/${id}/complete`)
  },
}
