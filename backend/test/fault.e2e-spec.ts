import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('FaultController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    token = res.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /faults/types', () => {
    it('应该获取故障类型列表', () => {
      return request(app.getHttpServer())
        .get('/faults/types')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('POST /faults/tickets', () => {
    it('应该创建故障工单', () => {
      return request(app.getHttpServer())
        .post('/faults/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          machineId: 'A-01',
          faultType: 'mouse',
          description: '鼠标左键失灵',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.machineId).toBe('A-01');
          expect(res.body.faultType).toBe('mouse');
          expect(res.body.status).toBe('pending');
        });
    });
  });

  describe('GET /faults/tickets', () => {
    it('应该获取故障工单列表', () => {
      return request(app.getHttpServer())
        .get('/faults/tickets')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('应该按状态筛选', () => {
      return request(app.getHttpServer())
        .get('/faults/tickets?status=pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((ticket: any) => {
            expect(ticket.status).toBe('pending');
          });
        });
    });
  });
});
