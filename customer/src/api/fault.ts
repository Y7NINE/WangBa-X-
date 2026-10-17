import api from './index'

export interface CreateTicketPayload {
  machineId: string
  faultType: string
  description?: string
  playerAction?: string
}

export interface FaultTicket {
  id: string
  machineId: string
  faultType: string
  status: string
  description?: string
  playerAction?: string
  createdAt: string
}

export const faultApi = {
  getTickets(params?: { status?: string }) {
    return api.get<FaultTicket[]>('/faults/tickets', { params })
  },
  createTicket(data: CreateTicketPayload) {
    return api.post<FaultTicket>('/faults/tickets', data)
  },
}
