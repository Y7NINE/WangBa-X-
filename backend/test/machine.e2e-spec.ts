import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('MachineController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 获取token
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    token = res.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /machines', () => {
    it('应该获取所有机器', () => {
      return request(app.getHttpServer())
        .get('/machines')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('应该按区域筛选机器', () => {
      return request(app.getHttpServer())
        .get('/machines?areaId=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((machine: any) => {
            expect(machine.areaId).toBe(1);
          });
        });
    });

    it('应该按状态筛选机器', () => {
      return request(app.getHttpServer())
        .get('/machines?status=offline')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((machine: any) => {
            expect(machine.status).toBe('offline');
          });
        });
    });
  });

  describe('GET /machines/:id', () => {
    it('应该获取单个机器', () => {
      return request(app.getHttpServer())
        .get('/machines/A-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('A-01');
        });
    });

    it('不存在的机器应该返回404', () => {
      return request(app.getHttpServer())
        .get('/machines/INVALID')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /machines/:id/status', () => {
    it('应该更新机器状态', () => {
      return request(app.getHttpServer())
        .patch('/machines/A-01/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'online' })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('online');
        });
    });
  });
});
