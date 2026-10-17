import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AnalyticsController (e2e)', () => {
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

  describe('GET /analytics/overview', () => {
    it('应返回总览统计', () => {
      return request(app.getHttpServer())
        .get('/analytics/overview')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('revenue');
          expect(res.body).toHaveProperty('sessions');
          expect(res.body).toHaveProperty('occupancyRate');
          expect(res.body).toHaveProperty('revenueByDay');
          expect(Array.isArray(res.body.revenueByDay)).toBe(true);
        });
    });
  });

  describe('GET /analytics/machines', () => {
    it('应返回按机器统计', () => {
      return request(app.getHttpServer())
        .get('/analytics/machines')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /analytics/areas', () => {
    it('应返回按区域统计', () => {
      return request(app.getHttpServer())
        .get('/analytics/areas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /analytics/hourly', () => {
    it('应返回 24 个时段桶', () => {
      return request(app.getHttpServer())
        .get('/analytics/hourly')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(24);
        });
    });
  });

  describe('GET /analytics/faults', () => {
    it('应返回故障统计', () => {
      return request(app.getHttpServer())
        .get('/analytics/faults')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('byType');
          expect(res.body).toHaveProperty('byStatus');
          expect(res.body).toHaveProperty('avgResolveMinutes');
        });
    });
  });

  describe('未认证访问', () => {
    it('应返回 401', () => {
      return request(app.getHttpServer())
        .get('/analytics/overview')
        .expect(401);
    });
  });
});
