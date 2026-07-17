import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`客户端连接: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`客户端断开: ${client.id}`);
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    // 处理心跳数据
    this.logger.debug(`收到心跳: ${data.machine_id}`);
    client.emit('heartbeat_ack', { timestamp: new Date() });
    
    // 广播机器状态更新
    this.server.emit('machine_status_update', {
      machine_id: data.machine_id,
      status: 'online',
      metrics: data.metrics,
    });
  }

  @SubscribeMessage('fault_alert')
  handleFaultAlert(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.logger.warn(`收到故障告警: ${data.machine_id} - ${data.fault_type}`);
    
    // 广播故障告警给所有客户端
    this.server.emit('new_alert', {
      id: `ALT-${Date.now()}`,
      machineId: data.machine_id,
      faultType: data.fault_type,
      priority: data.priority || 'P2',
      source: 'auto_detect',
      status: 'pending',
      description: data.description,
      createdAt: new Date(),
    });
  }

  // 广播机器状态更新
  broadcastMachineUpdate(machineId: string, status: string) {
    this.server.emit('machine_status_update', {
      machine_id: machineId,
      status,
      timestamp: new Date(),
    });
  }

  // 广播故障工单更新
  broadcastTicketUpdate(ticketId: string, updates: any) {
    this.server.emit('ticket_update', {
      id: ticketId,
      updates,
      timestamp: new Date(),
    });
  }

  // 发送告警给指定客户端
  sendAlertToClient(clientId: string, alert: any) {
    this.server.to(clientId).emit('new_alert', alert);
  }

  // 广播通知给所有客户端
  broadcastNotification(notification: any) {
    this.server.emit('notification', notification);
  }
}
