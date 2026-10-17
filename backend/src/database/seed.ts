import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Staff } from '../modules/user/staff.entity';
import { User } from '../modules/user/user.entity';
import { Area } from '../modules/area/area.entity';
import { Machine } from '../modules/machine/machine.entity';
import { FaultType } from '../modules/fault/fault-type.entity';
import { Session } from '../modules/billing/session.entity';
import { Transaction } from '../modules/billing/transaction.entity';

const dataSource = new DataSource({
  type: 'better-sqlite3',
  database: 'netcafe.db',
  entities: [Staff, User, Area, Machine, FaultType, Session, Transaction],
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('数据库已连接');

  // 创建默认管理员
  const staffRepo = dataSource.getRepository(Staff);
  const existingAdmin = await staffRepo.findOne({ where: { username: 'admin' } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = staffRepo.create({
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      role: 'admin',
    });
    await staffRepo.save(admin);
    console.log('默认管理员已创建: admin / admin123');
  } else {
    console.log('管理员账号已存在');
  }

  // 创建测试用户
  const userRepo = dataSource.getRepository(User);
  const userCount = await userRepo.count();

  if (userCount === 0) {
    const users = userRepo.create([
      { nickname: '张三', phone: '13800138001', balance: 50, credits: 1200, memberLevel: 'gold', totalSpent: 3500 },
      { nickname: '李四', phone: '13800138002', balance: 120, credits: 800, memberLevel: 'silver', totalSpent: 1800 },
      { nickname: '王五', phone: '13800138003', balance: 30, credits: 2500, memberLevel: 'diamond', totalSpent: 5200 },
      { nickname: '赵六', phone: '13800138004', balance: 200, credits: 500, memberLevel: 'normal', totalSpent: 800 },
      { nickname: '钱七', phone: '13800138005', balance: 80, credits: 1500, memberLevel: 'gold', totalSpent: 4200 },
    ]);
    await userRepo.save(users);
    console.log('测试用户已创建: 张三、李四、王五、赵六、钱七');
  } else {
    console.log('用户数据已存在');
  }

  // 创建默认区域
  const areaRepo = dataSource.getRepository(Area);
  const areaCount = await areaRepo.count();

  if (areaCount === 0) {
    const areas = areaRepo.create([
      { name: '竞技区', description: '高端电竞设备', pricePerHour: 15, sortOrder: 1 },
      { name: '休闲区', description: '舒适环境', pricePerHour: 10, sortOrder: 2 },
      { name: '包间', description: '独立空间', pricePerHour: 20, sortOrder: 3 },
    ]);
    await areaRepo.save(areas);
    console.log('默认区域已创建');
  }

  // 创建默认机器
  const machineRepo = dataSource.getRepository(Machine);
  const machineCount = await machineRepo.count();

  if (machineCount === 0) {
    const machinesData: any[] = [];
    for (let i = 1; i <= 5; i++) {
      machinesData.push({ id: `A-${String(i).padStart(2, '0')}`, areaId: 1, status: 'offline' });
    }
    for (let i = 1; i <= 5; i++) {
      machinesData.push({ id: `B-${String(i).padStart(2, '0')}`, areaId: 2, status: 'offline' });
    }
    for (let i = 1; i <= 6; i++) {
      machinesData.push({ id: `C-${String(i).padStart(2, '0')}`, areaId: 3, status: 'offline' });
    }
    await machineRepo.save(machinesData);
    console.log('默认机器已创建: A-01~A-05, B-01~B-05, C-01~C-06');
  }

  // 创建故障类型
  const faultTypeRepo = dataSource.getRepository(FaultType);
  const faultCount = await faultTypeRepo.count();

  if (faultCount === 0) {
    const faultTypes = faultTypeRepo.create([
      { id: 'mouse', name: '鼠标故障', category: 'peripheral', defaultPriority: 'P2', timeoutMinutes: 10 },
      { id: 'keyboard', name: '键盘故障', category: 'peripheral', defaultPriority: 'P2', timeoutMinutes: 10 },
      { id: 'headset', name: '耳机故障', category: 'peripheral', defaultPriority: 'P2', timeoutMinutes: 10 },
      { id: 'monitor', name: '显示器故障', category: 'hardware', defaultPriority: 'P1', timeoutMinutes: 5 },
      { id: 'network', name: '网络异常', category: 'network', defaultPriority: 'P2', timeoutMinutes: 10 },
      { id: 'slow', name: '机器卡顿', category: 'software', defaultPriority: 'P3', timeoutMinutes: 15 },
      { id: 'overheat', name: '硬件过热', category: 'hardware', defaultPriority: 'P1', timeoutMinutes: 5 },
      { id: 'bsod', name: '蓝屏', category: 'software', defaultPriority: 'P1', timeoutMinutes: 5 },
    ]);
    await faultTypeRepo.save(faultTypes);
    console.log('故障类型已创建');
  }

  // 演示用历史会话 + 消费交易（让报表营收可自证）
  const sessionRepo = dataSource.getRepository(Session);
  const txRepo = dataSource.getRepository(Transaction);
  const sessionCount = await sessionRepo.count();
  if (sessionCount === 0) {
    const demoUsers = await userRepo.find({ take: 5 });
    const demoMachines = await machineRepo.find();
    const samples: Array<{ userId: number; machineId: string; hours: number; rate: number }> = [
      { userId: demoUsers[0].id, machineId: 'A-01', hours: 3, rate: 15 },
      { userId: demoUsers[1].id, machineId: 'A-02', hours: 2, rate: 15 },
      { userId: demoUsers[2].id, machineId: 'B-01', hours: 4, rate: 10 },
      { userId: demoUsers[3].id, machineId: 'C-01', hours: 1.5, rate: 20 },
      { userId: demoUsers[4].id, machineId: 'A-03', hours: 2.5, rate: 15 },
    ];
    for (let d = 6; d >= 1; d--) {
      for (const s of samples) {
        if (!demoMachines.find((m) => m.id === s.machineId)) continue;
        const start = new Date(Date.now() - d * 86400000);
        start.setHours(14, 0, 0, 0);
        const end = new Date(start.getTime() + s.hours * 3600000);
        const minutes = Math.round(s.hours * 60);
        const amount = Math.round(s.hours * s.rate * 100) / 100;
        const sess = await sessionRepo.save(
          sessionRepo.create({
            userId: s.userId,
            machineId: s.machineId,
            startTime: start,
            endTime: end,
            duration: minutes,
            amount,
            status: 'completed',
          }),
        );
        const user = await userRepo.findOne({ where: { id: s.userId } });
        const balanceAfter = Math.round((Number(user!.balance) - amount) * 100) / 100;
        await userRepo.update(s.userId, { balance: balanceAfter });
        await txRepo.save(
          txRepo.create({
            userId: s.userId,
            type: 'consume',
            amount,
            balanceAfter,
            paymentMethod: 'balance',
            referenceId: String(sess.id),
            description: `演示上机 ${s.machineId} ${minutes}分钟`,
          }),
        );
      }
    }
    console.log('演示会话与消费交易已创建（近 6 天）');
  }

  console.log('数据初始化完成!');
  await dataSource.destroy();
}

seed().catch(console.error);
