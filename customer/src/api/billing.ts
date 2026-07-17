import api from './index'

export const billingApi = {
  startSession(userId: number, machineId: string) {
    return api.post('/billing/sessions', { userId, machineId })
  },
  endSession(sessionId: number) {
    return api.patch(`/billing/sessions/${sessionId}/end`)
  },
  getActiveSession(userId: number) {
    return api.get('/billing/sessions', { params: { userId, status: 'active' } })
  },
}
