import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('应该成功登录', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'admin', password: 'admin123' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.username).toBe('admin');
        });
    });

    it('密码错误应该返回401', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' })
        .expect(401);
    });

    it('用户名不存在应该返回401', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'nonexistent', password: 'admin123' })
        .expect(401);
    });
  });

  describe('GET /auth/profile', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      token = res.body.token;
    });

    it('应该获取用户信息', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('username');
        });
    });

    it('没有token应该返回401', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });
  });
});
