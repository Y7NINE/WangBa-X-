import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Session } from '../billing/session.entity';
import { Transaction } from '../billing/transaction.entity';
import { Machine } from '../machine/machine.entity';
import { FaultTicket } from '../fault/fault-ticket.entity';
import { Area } from '../area/area.entity';
import { User } from '../user/user.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Machine)
    private machineRepository: Repository<Machine>,
    @InjectRepository(FaultTicket)
    private faultRepository: Repository<FaultTicket>,
    @InjectRepository(Area)
    private areaRepository: Repository<Area>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private dateRange(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) throw new BadRequestException('查询日期范围不正确');
    return { start, end };
  }

  async getOverview(from?: string, to?: string) {
    const { start, end } = this.dateRange(from, to);

    const sessions = await this.sessionRepository.find({
      where: {
        startTime: Between(start, end),
      },
    });

    const transactions = await this.transactionRepository.find({
      where: {
        type: In(['consume', 'refund']),
        createdAt: Between(start, end),
      },
    });

    const faults = await this.faultRepository.find({
      where: {
        createdAt: Between(start, end),
      },
    });

    const totalMachines = await this.machineRepository.count();
    const activeMachines = await this.machineRepository.count({
      where: { status: 'online' },
    });

    const revenue = transactions.reduce((s, t) => s + (t.type === 'refund' ? -1 : 1) * Number(t.amount), 0);
    const hours = sessions.reduce((s, x) => s + (x.duration || 0), 0) / 60;
    const occupancyRate = totalMachines > 0
      ? Math.round((activeMachines / totalMachines) * 1000) / 10
      : 0;

    const activeUsers = new Set(sessions.map((s) => s.userId)).size;

    // 按日聚合
    const byDay = new Map<string, { date: string; revenue: number; sessions: number }>();
    for (const t of transactions) {
      const d = this.dayKey(t.createdAt);
      const row = byDay.get(d) || { date: d, revenue: 0, sessions: 0 };
      row.revenue += (t.type === 'refund' ? -1 : 1) * Number(t.amount);
      byDay.set(d, row);
    }
    for (const s of sessions) {
      const d = this.dayKey(s.startTime);
      const row = byDay.get(d) || { date: d, revenue: 0, sessions: 0 };
      row.sessions += 1;
      byDay.set(d, row);
    }
    const revenueByDay = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      revenue: Math.round(revenue * 100) / 100,
      sessions: sessions.length,
      hours: Math.round(hours * 10) / 10,
      occupancyRate,
      faultCount: faults.length,
      activeUsers,
      revenueByDay,
    };
  }

  async getMachineStats(from?: string, to?: string) {
    const { start, end } = this.dateRange(from, to);

    const sessions = await this.sessionRepository.find({
      where: {
        startTime: Between(start, end),
      },
    });

    const faults = await this.faultRepository.find({
      where: {
        createdAt: Between(start, end),
      },
    });

    const machines = await this.machineRepository.find({ relations: ['area'] });

    return machines.map((m) => {
      const mSessions = sessions.filter((s) => s.machineId === m.id);
      const mFaults = faults.filter((f) => f.machineId === m.id);
      const minutes = mSessions.reduce((s, x) => s + (x.duration || 0), 0);
      const revenue = mSessions.reduce((s, x) => s + Number(x.amount || 0), 0);

      return {
        machineId: m.id,
        areaName: m.area?.name || '',
        status: m.status,
        revenue: Math.round(revenue * 100) / 100,
        sessions: mSessions.length,
        hours: Math.round((minutes / 60) * 10) / 10,
        occupancy: 0,
        faultCount: mFaults.length,
      };
    });
  }

  async getAreaStats(from?: string, to?: string) {
    const { start, end } = this.dateRange(from, to);

    const sessions = await this.sessionRepository.find({
      where: {
        startTime: Between(start, end),
      },
    });

    const faults = await this.faultRepository.find({
      where: {
        createdAt: Between(start, end),
      },
    });

    const areas = await this.areaRepository.find({ relations: ['machines'] });

    return areas.map((a) => {
      const machineIds = (a.machines || []).map((m) => m.id);
      const aSessions = sessions.filter((s) => machineIds.includes(s.machineId));
      const aFaults = faults.filter((f) => machineIds.includes(f.machineId));
      const minutes = aSessions.reduce((s, x) => s + (x.duration || 0), 0);
      const revenue = aSessions.reduce((s, x) => s + Number(x.amount || 0), 0);

      return {
        areaId: a.id,
        areaName: a.name,
        machineCount: machineIds.length,
        revenue: Math.round(revenue * 100) / 100,
        sessions: aSessions.length,
        hours: Math.round((minutes / 60) * 10) / 10,
        occupancy: 0,
        avgPrice: Number(a.pricePerHour) || 0,
        faultCount: aFaults.length,
      };
    });
  }

  async getHourly(date?: string) {
    const day = date ? new Date(date) : new Date();
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const sessions = await this.sessionRepository.find({
      where: { startTime: Between(start, end) },
    });

    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      sessions: 0,
      revenue: 0,
    }));

    for (const s of sessions) {
      const h = new Date(s.startTime).getHours();
      buckets[h].sessions += 1;
      buckets[h].revenue += Number(s.amount || 0);
    }

    return buckets.map((b) => ({
      ...b,
      revenue: Math.round(b.revenue * 100) / 100,
    }));
  }

  async getFaultStats(from?: string, to?: string) {
    const { start, end } = this.dateRange(from, to);

    const faults = await this.faultRepository.find({
      where: {
        createdAt: Between(start, end),
      },
    });

    const byType = new Map<string, number>();
    const byStatus = new Map<string, number>();
    let resolveTotal = 0;
    let resolveCount = 0;

    for (const f of faults) {
      byType.set(f.faultType, (byType.get(f.faultType) || 0) + 1);
      byStatus.set(f.status, (byStatus.get(f.status) || 0) + 1);
      if (f.acceptedAt && f.resolvedAt) {
        resolveTotal += (new Date(f.resolvedAt).getTime() - new Date(f.acceptedAt).getTime()) / 60000;
        resolveCount += 1;
      }
    }

    return {
      byType: Array.from(byType.entries()).map(([type, count]) => ({ type, count })),
      byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
      avgResolveMinutes: resolveCount > 0 ? Math.round(resolveTotal / resolveCount) : 0,
    };
  }

  private dayKey(d: Date | string) {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
