import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { Staff } from '../../modules/user/staff.entity';
import { User } from '../../modules/user/user.entity';
import { STAFF_ROLES, ActorRole } from '../../modules/auth/roles.decorator';

export interface SocketActor { id: number; role: ActorRole; expiresAt: number }
export type SocketTopic = 'machines' | 'tickets' | 'orders' | 'notifications';

@Injectable()
export class SocketPolicy {
  constructor(private jwt: JwtService, private config: ConfigService, private source: DataSource) {}
  async authenticate(token: unknown): Promise<SocketActor> {
    if (typeof token !== 'string' || !token || token.length > 8192) throw new Error('UNAUTHORIZED');
    const claims = await this.jwt.verifyAsync(token, { secret: this.config.get('JWT_SECRET', 'default-secret'), algorithms: ['HS256'] });
    const actor = { id: claims.sub, role: claims.role, expiresAt: claims.exp * 1000 };
    if (!Number.isSafeInteger(claims.exp)) throw new Error('UNAUTHORIZED');
    await this.assertCurrent(actor);
    return actor;
  }
  async assertCurrent(actor: SocketActor): Promise<void> {
    if (!actor || !Number.isSafeInteger(actor.id) || actor.id < 1 || !Number.isFinite(actor.expiresAt) || actor.expiresAt <= Date.now()) throw new Error('UNAUTHORIZED');
    if (actor.role === 'customer') {
      if (!(await this.source.getRepository(User).findOneBy({ id: actor.id, isActive: true }))) throw new Error('UNAUTHORIZED');
    } else {
      if (!(STAFF_ROLES as readonly string[]).includes(actor.role)) throw new Error('UNAUTHORIZED');
      if (!(await this.source.getRepository(Staff).findOneBy({ id: actor.id, role: actor.role }))) throw new Error('UNAUTHORIZED');
    }
  }
  room(actor: SocketActor, topic: SocketTopic): string | null {
    if (topic === 'machines') return 'machines';
    if (actor.role === 'customer') return ['tickets', 'orders'].includes(topic) ? `customer:${actor.id}:${topic}` : null;
    if (topic === 'tickets' && ['admin', 'manager', 'cashier', 'technician'].includes(actor.role)) return 'staff:tickets';
    if (topic === 'orders' && ['admin', 'manager', 'cashier'].includes(actor.role)) return 'staff:orders';
    if (topic === 'notifications' && ['admin', 'manager'].includes(actor.role)) return 'staff:notifications';
    return null;
  }
}
