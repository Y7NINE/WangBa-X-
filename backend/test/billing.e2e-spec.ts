import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('BillingController (e2e)', () => {
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

  describe('GET /billing/sessions', () => {
    it('应该获取会话列表', () => {
      return request(app.getHttpServer())
        .get('/billing/sessions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('POST /billing/recharge', () => {
    it('应该成功充值', () => {
      return request(app.getHttpServer())
        .post('/billing/recharge')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: 1,
          amount: 100,
          paymentMethod: 'cash',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.type).toBe('recharge');
          expect(res.body.amount).toBe(100);
        });
    });
  });

  describe('GET /billing/transactions', () => {
    it('应该获取交易记录', () => {
      return request(app.getHttpServer())
        .get('/billing/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
