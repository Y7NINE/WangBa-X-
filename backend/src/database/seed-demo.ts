import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import * as bcrypt from 'bcrypt';
import { Staff } from '../modules/user/staff.entity';
import { User } from '../modules/user/user.entity';
import { Area } from '../modules/area/area.entity';
import { Machine } from '../modules/machine/machine.entity';
import { FaultType } from '../modules/fault/fault-type.entity';
import { FaultTicket } from '../modules/fault/fault-ticket.entity';
import { CleaningTask } from '../modules/cleaning/cleaning-task.entity';
import { Session } from '../modules/billing/session.entity';
import { Transaction } from '../modules/billing/transaction.entity';

async function seedDemo() {
  if (process.env.DEMO_MODE !== 'true' || process.env.NODE_ENV === 'production') throw new Error('仅允许在非生产演示模式初始化');
  const database = process.env.DB_DATABASE;
  if (!database || !database.endsWith('demo.sqlite')) throw new Error('演示数据库路径必须以demo.sqlite结尾');
  mkdirSync(dirname(database), { recursive: true });
  const source = new DataSource({ type: 'better-sqlite3', database, entities: [__dirname + '/../**/*.entity{.ts,.js}'], synchronize: true });
  await source.initialize();
  try {
    await source.transaction(async manager => {
      if (!await manager.findOneBy(Staff, { username: 'admin' })) await manager.save(Staff, manager.create(Staff, { username: 'admin', password: await bcrypt.hash('admin123', 10), name: '演示店长', role: 'admin' }));
      for (const [index, nickname] of ['山间客', '听雨', '小满', '松风', '白露'].entries()) {
        const phone = `1380013800${index + 1}`;
        if (!await manager.findOneBy(User, { phone })) {
          const user = await manager.save(User, manager.create(User, { phone, nickname, balance: 300, credits: 100 + index * 20, memberLevel: index === 0 ? 'gold' : 'normal' }));
          await manager.save(Transaction, manager.create(Transaction, { userId: user.id, type: 'recharge', amount: 300, balanceAfter: 300, paymentMethod: 'demo', description: '本地演示初始余额（非真实资金）' }));
        }
      }
      for (const [index, config] of [{ name: '竞技区', rate: 15, description: '多人同游，畅快开局', count: 8, prefix: 'A' }, { name: '休闲区', rate: 10, description: '松弛一点，自在游戏', count: 8, prefix: 'B' }, { name: '独立包间', rate: 20, description: '独享片刻，安静尽兴', count: 6, prefix: 'C' }].entries()) {
        let area = await manager.findOneBy(Area, { name: config.name });
        if (!area) area = await manager.save(Area, manager.create(Area, { name: config.name, pricePerHour: config.rate, description: config.description, sortOrder: index + 1 }));
        for (let i = 1; i <= config.count; i++) {
          const id = `${config.prefix}-${String(i).padStart(2, '0')}`;
          if (!await manager.findOneBy(Machine, { id })) await manager.save(Machine, manager.create(Machine, { id, areaId: area.id, status: 'offline', positionX: (i - 1) % 4, positionY: Math.floor((i - 1) / 4) }));
        }
      }
      for (const [id, name, category] of [['mouse', '鼠标故障', 'peripheral'], ['keyboard', '键盘故障', 'peripheral'], ['headset', '耳机故障', 'peripheral'], ['monitor', '显示器故障', 'hardware'], ['network', '网络异常', 'network'], ['slow', '机器卡顿', 'software'], ['other', '其他问题', 'software']]) {
        if (!await manager.findOneBy(FaultType, { id })) await manager.save(FaultType, manager.create(FaultType, { id, name, category, defaultPriority: 'P2', timeoutMinutes: 10 }));
      }
      // Only initialize the scenario once. Re-running never overwrites subsequent customer actions.
      if (!await manager.findOneBy(FaultTicket, { id: 'DEMO-FAULT-001' })) {
        const machine = await manager.findOneBy(Machine, { id: 'B-08' });
        if (machine?.status === 'offline') {
          await manager.update(Machine, machine.id, { status: 'fault' });
          await manager.save(FaultTicket, manager.create(FaultTicket, { id: 'DEMO-FAULT-001', machineId: machine.id, faultType: 'headset', faultCategory: 'peripheral', source: 'staff_report', priority: 'P2', status: 'pending', description: '演示工单：耳机接触不良', timeoutAt: new Date(Date.now() + 600000) }));
        }
      }
      if (!await manager.findOneBy(CleaningTask, { machineId: 'A-08' })) {
        const machine = await manager.findOneBy(Machine, { id: 'A-08' });
        if (machine?.status === 'offline') {
          await manager.update(Machine, machine.id, { status: 'dirty' });
          await manager.save(CleaningTask, manager.create(CleaningTask, { machineId: machine.id, status: 'pending', createdAt: new Date() }));
        }
      }
    });
    console.log('本地仿真数据已就绪：3区域 / 22座位 / 5个演示会员；重复启动保留操作记录。');
  } finally { await source.destroy(); }
}
seedDemo().catch(error => { console.error(error); process.exitCode = 1; });
