import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import { isUUID } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './order.entity';
import { User } from '../user/user.entity';
import { Session } from '../billing/session.entity';
import { Transaction } from '../billing/transaction.entity';
import { MENU } from './menu';
import { localTransaction } from '../../common/local-transaction';
import { CreateOrderDto } from './order.dto';

interface OrderActor { id: number; role: string }

@Injectable()
export class OrderService {
  constructor(@InjectRepository(Order) private orders: Repository<Order>, private source: DataSource) {}
  private actorType(actor: OrderActor): 'customer' | 'staff' {
    if (!actor || !Number.isSafeInteger(actor.id) || actor.id < 1 ||
      !['customer', 'admin', 'manager', 'cashier'].includes(actor.role)) throw new ForbiddenException('下单身份无效');
    return actor.role === 'customer' ? 'customer' : 'staff';
  }
  async getRequestResult(requestId: string, actor: OrderActor): Promise<Order> {
    const createdByType = this.actorType(actor);
    if (!isUUID(requestId, '4')) throw new BadRequestException('请求编号须为UUID v4');
    return localTransaction(this.source, async manager => {
      const order = await manager.findOneBy(Order, { requestId: requestId.toLowerCase(), createdById: actor.id, createdByType });
      if (!order) throw new NotFoundException('尚未查到订单结果，请使用原编号确认或重试');
      return order;
    });
  }
  async create(data: CreateOrderDto, actor: OrderActor): Promise<Order> {
    const createdByType = this.actorType(actor);
    const userId = createdByType === 'customer' ? actor.id : data.userId;
    if (!Number.isSafeInteger(userId) || Number(userId) < 1) throw new BadRequestException('请指定有效的会员ID');
    if (!isUUID(data.requestId, '4')) throw new BadRequestException('请求编号须为UUID v4');
    const requestId = data.requestId.toLowerCase();
    const input = data.items;
    if (!Array.isArray(input) || input.length < 1 || input.length > 30) throw new BadRequestException('请选择1至30种商品');
    const normalized = input.map(item => {
      if (!item || !Number.isSafeInteger(item.itemId) || item.itemId < 1 || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 20) {
        throw new BadRequestException('商品或数量不正确');
      }
      return { itemId: item.itemId, qty: item.qty };
    }).sort((a, b) => a.itemId - b.itemId);
    if (new Set(normalized.map(item => item.itemId)).size !== normalized.length) throw new BadRequestException('同一商品请合并数量，最多20份');
    const remark = data.remark === undefined ? '' : data.remark;
    if (typeof remark !== 'string' || remark.length > 255) throw new BadRequestException('备注最多255字');
    const requestFingerprint = createHash('sha256').update(JSON.stringify({ userId, items: normalized, remark })).digest('hex');
    return localTransaction(this.source, async manager => {
      const original = await manager.findOneBy(Order, { requestId });
      if (original) {
        if (original.createdById !== actor.id || original.createdByType !== createdByType || original.requestFingerprint !== requestFingerprint) {
          throw new ConflictException('请求编号已用于其他订单，请先核对原订单');
        }
        return original;
      }
      const items = normalized.map(item => {
        const product = MENU.find(product => product.id === item.itemId);
        if (!product) throw new BadRequestException('商品不存在或已下架');
        return { itemId: product.id, name: product.name, price: product.price, qty: item.qty };
      });
      const total = Math.round(items.reduce((sum, item) => sum + item.price * item.qty, 0) * 100) / 100;
      const user = await manager.findOneBy(User, { id: userId });
      if (!user || !user.isActive) throw new BadRequestException('用户不可用');
      const session = await manager.findOne(Session, { where: [{ userId: user.id, status: 'active' }, { userId: user.id, status: 'paused' }] });
      if (!session) throw new BadRequestException('请先上机后再下单，餐饮将送到当前座位');
      if (session.settlementRequestedAt) throw new BadRequestException('当前会话待结算，请先补款完成结算后再点单');
      if (Number(user.balance) < total) throw new BadRequestException('余额不足，请联系前台充值');
      const balanceAfter = Math.round((Number(user.balance) - total) * 100) / 100;
      const order = await manager.save(Order, manager.create(Order, {
        userId: user.id, machineId: session.machineId, items: JSON.stringify(items), total, remark, status: 'pending',
        requestId, requestFingerprint, createdById: actor.id, createdByType,
      }));
      await manager.update(User, user.id, { balance: balanceAfter });
      await manager.save(Transaction, manager.create(Transaction, { userId: user.id, type: 'consume', amount: total, balanceAfter, paymentMethod: 'balance', referenceId: `order:${order.id}`, description: `水吧点单 #${order.id}` }));
      return order;
    });
  }
  async findAll(status?: string, userId?: number) {
    return this.orders.find({ where: { ...(status ? { status } : {}), ...(userId !== undefined ? { userId } : {}) }, order: { createdAt: 'DESC' }, take: 100 });
  }
  async updateStatus(id: number, status: string) {
    return localTransaction(this.source, async manager => {
      const order = await manager.findOneBy(Order, { id: Number(id) });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.status === status) return order;
      const allowed = { pending: ['preparing', 'cancelled'], preparing: ['delivering', 'cancelled'], delivering: ['completed'] };
      if (!(allowed[order.status] || []).includes(status)) throw new BadRequestException('订单状态不允许这样变更');
      if (status === 'cancelled') {
        const user = await manager.findOneBy(User, { id: order.userId });
        if (!user) throw new NotFoundException('用户不存在');
        const balanceAfter = Math.round((Number(user.balance) + Number(order.total)) * 100) / 100;
        await manager.update(User, user.id, { balance: balanceAfter });
        await manager.save(Transaction, manager.create(Transaction, { userId: user.id, type: 'refund', amount: Number(order.total), balanceAfter, paymentMethod: 'balance', referenceId: `order:${order.id}`, description: `取消水吧订单 #${order.id}` }));
      }
      order.status = status;
      return manager.save(Order, order);
    });
  }
}
