import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let createdUserId: number;

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

  describe('POST /users', () => {
    it('应创建用户', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '13800000001', nickname: '测试用户e2e' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.phone).toBe('13800000001');
          createdUserId = res.body.id;
        });
    });
  });

  describe('GET /users', () => {
    it('应返回用户列表', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('PATCH /users/:id', () => {
    it('应更新用户', () => {
      return request(app.getHttpServer())
        .patch(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '已更新昵称' })
        .expect(200)
        .expect((res) => {
          expect(res.body.nickname).toBe('已更新昵称');
        });
    });
  });

  describe('DELETE /users/:id', () => {
    it('应删除用户', () => {
      return request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('POST /auth/customer/login', () => {
    it('应支持顾客验证码登录', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/customer/login')
        .send({ phone: '13900000001', code: '123456' })
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.phone).toBe('13900000001');
    });

    it('错误验证码应返回 401', () => {
      return request(app.getHttpServer())
        .post('/auth/customer/login')
        .send({ phone: '13900000002', code: '000000' })
        .expect(401);
    });
  });
});
