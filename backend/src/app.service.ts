import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '网吧综合管理系统 API v1.0';
  }

  getHealth() {
    return {
      status: 'ok',
      mode: process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production' ? 'demo' : 'standard',
      demoPhone: process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production' ? '13800138001' : undefined,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
