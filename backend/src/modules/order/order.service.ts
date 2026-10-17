import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './order.entity';
import { User } from '../user/user.entity';
import { Session } from '../billing/session.entity';
import { Transaction } from '../billing/transaction.entity';
import { MENU } from './menu';
import { localTransaction } from '../../common/local-transaction';

@Injectable()
export class OrderService {
  constructor(@InjectRepository(Order) private orders: Repository<Order>, private source: DataSource) {}
  async create(data: Partial<Order>): Promise<Order> {
    let input: any;
    try { input = typeof data.items === 'string' ? JSON.parse(data.items) : data.items; }
    catch { throw new BadRequestException('商品明细格式不正确'); }
    if (!Array.isArray(input) || input.length < 1 || input.length > 30) throw new BadRequestException('请选择1至30种商品');
    const items = input.map(item => {
      const product = MENU.find(product => product.id === item.itemId);
      if (!product || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 20) throw new BadRequestException('商品或数量不正确');
      return { itemId: product.id, name: product.name, price: product.price, qty: item.qty };
    });
    const total = Math.round(items.reduce((sum, item) => sum + item.price * item.qty, 0) * 100) / 100;
    return localTransaction(this.source, async manager => {
      const user = await manager.findOneBy(User, { id: data.userId });
      if (!user || !user.isActive) throw new BadRequestException('用户不可用');
      const session = await manager.findOne(Session, { where: [{ userId: user.id, status: 'active' }, { userId: user.id, status: 'paused' }] });
      if (!session) throw new BadRequestException('请先上机后再下单，餐饮将送到当前座位');
      if (Number(user.balance) < total) throw new BadRequestException('余额不足，请联系前台充值');
      const balanceAfter = Math.round((Number(user.balance) - total) * 100) / 100;
      const order = await manager.save(Order, manager.create(Order, { userId: user.id, machineId: session.machineId, items: JSON.stringify(items), total, remark: String(data.remark || '').slice(0, 255), status: 'pending' }));
      await manager.update(User, user.id, { balance: balanceAfter });
      await manager.save(Transaction, manager.create(Transaction, { userId: user.id, type: 'consume', amount: total, balanceAfter, paymentMethod: 'balance', referenceId: `order:${order.id}`, description: `水吧点单 #${order.id}` }));
      return order;
    });
  }
  async findAll(status?: string, userId?: number) {
    return this.orders.find({ where: { ...(status ? { status } : {}), ...(userId ? { userId } : {}) }, order: { createdAt: 'DESC' }, take: 100 });
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
