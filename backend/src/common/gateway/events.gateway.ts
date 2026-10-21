import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { OnApplicationShutdown } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DataSource } from 'typeorm';
import { SocketActor, SocketPolicy, SocketTopic } from './socket-policy';
import { FaultTicket } from '../../modules/fault/fault-ticket.entity';

@WebSocketGateway({ cors: {
  origin: ['http://localhost:5173', 'http://localhost:5180', 'http://127.0.0.1:5173', 'http://127.0.0.1:5180'], credentials: true,
} })
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnApplicationShutdown {
  @WebSocketServer() server: Server;
  private expiry = new Map<string, ReturnType<typeof setTimeout>>();
  constructor(private policy: SocketPolicy, private source: DataSource) {}

  afterInit(server: Server) {
    server.use(async (client, next) => {
      try {
        client.data.actor = await this.policy.authenticate(client.handshake.auth?.token);
        await client.join('machines');
        next();
      } catch { next(new Error('UNAUTHORIZED')); }
    });
  }
  handleConnection(client: Socket) {
    const actor = client.data.actor as SocketActor;
    this.expiry.set(client.id, setTimeout(() => client.disconnect(true), Math.min(actor.expiresAt - Date.now(), 2147483647)));
    client.use(async (_packet, next) => {
      try { await this.policy.assertCurrent(actor); next(); }
      catch { next(new Error('UNAUTHORIZED')); client.disconnect(true); }
    });
  }
  handleDisconnect(client: Socket) {
    clearTimeout(this.expiry.get(client.id));
    this.expiry.delete(client.id);
  }
  onApplicationShutdown() {
    for (const timer of this.expiry.values()) clearTimeout(timer);
    this.expiry.clear();
  }
  @SubscribeMessage('subscribe')
  async subscribe(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const topics = ['machines', 'tickets', 'orders', 'notifications'];
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length !== 1 || !topics.includes((data as any).topic)) {
      return { ok: false, error: 'INVALID_SUBSCRIPTION' };
    }
    const topic = (data as { topic: SocketTopic }).topic;
    const room = this.policy.room(client.data.actor, topic);
    if (!room) return { ok: false, error: 'FORBIDDEN' };
    await client.join(room);
    return { ok: true, topic };
  }
  @SubscribeMessage('heartbeat')
  heartbeat(@ConnectedSocket() client: Socket) {
    client.emit('heartbeat_ack', { timestamp: new Date() });
    return { ok: true };
  }
  @SubscribeMessage('fault_alert')
  faultAlert(@ConnectedSocket() client: Socket) {
    client.emit('device_error', { message: '请通过已认证HTTP接口上报故障' });
    return { ok: false, error: 'HTTP_API_REQUIRED' };
  }
  private async publish(room: string, event: string, payload: unknown) {
    if (!this.server) return;
    const clients = await this.server.in(room).fetchSockets();
    await Promise.all(clients.map(async client => {
      try { await this.policy.assertCurrent(client.data.actor); client.emit(event, payload); }
      catch { client.disconnect(true); }
    }));
  }
  async broadcastMachineUpdate(machineId: string, status: string) {
    try { await this.publish('machines', 'machine_status_update', { machine_id: machineId, status, timestamp: new Date() }); }
    catch { /* HTTP state remains authoritative if delivery fails. */ }
  }
  async broadcastTicketUpdate(ticketId: string, updates: unknown) {
    try {
      const ticket = await this.source.getRepository(FaultTicket).findOneBy({ id: ticketId });
      if (!ticket) return;
      const payload = { id: ticketId, updates, timestamp: new Date() };
      await this.publish('staff:tickets', 'ticket_update', payload);
      if (ticket.reporterType === 'player' && Number.isSafeInteger(ticket.reporterId) && ticket.reporterId > 0) {
        await this.publish(`customer:${ticket.reporterId}:tickets`, 'ticket_update', payload);
      }
    } catch { /* Reconnect recovery is implemented separately. */ }
  }
  async broadcastTicketCreated(ticketId: string) {
    try {
      const ticket = await this.source.getRepository(FaultTicket).findOneBy({ id: ticketId });
      if (!ticket) return;
      // Existing admin clients insert full new_alert snapshots into the ticket list.
      await this.publish('staff:tickets', 'new_alert', ticket);
      if (ticket.reporterType === 'player' && Number.isSafeInteger(ticket.reporterId) && ticket.reporterId > 0) {
        await this.publish(`customer:${ticket.reporterId}:tickets`, 'ticket_update', { id: ticket.id, updates: ticket, timestamp: new Date() });
      }
    } catch { /* A delivery failure must not turn a committed report into an HTTP failure. */ }
  }
  async sendAlertToClient(clientId: string, alert: unknown) {
    const client = this.server?.sockets.sockets.get(clientId);
    if (!client || !this.policy.room(client.data.actor, 'tickets')?.startsWith('staff:')) return;
    try { await this.publish(clientId, 'new_alert', alert); } catch {}
  }
  async broadcastNotification(notification: unknown) {
    try { await this.publish('staff:notifications', 'notification', notification); } catch {}
  }
}
