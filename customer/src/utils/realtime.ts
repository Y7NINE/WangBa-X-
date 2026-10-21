import { io } from 'socket.io-client'

export function connectCustomerSocket(onConnect: () => unknown, onMachine: (data: { machine_id: string; status: string }) => void,
  getToken: () => string | null = () => localStorage.getItem('customer_token')) {
  if (!getToken()) return null;
  const socket = io({ path: '/socket.io', auth: callback => callback({ token: getToken() }) });
  socket.on('connect', onConnect);
  socket.on('machine_status_update', onMachine);
  return socket;
}
