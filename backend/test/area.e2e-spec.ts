import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AreaController (e2e)', () => {
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

  describe('GET /areas', () => {
    it('应该获取所有区域', () => {
      return request(app.getHttpServer())
        .get('/areas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);
        });
    });
  });

  describe('GET /areas/:id', () => {
    it('应该获取单个区域', () => {
      return request(app.getHttpServer())
        .get('/areas/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(1);
          expect(res.body.name).toBe('竞技区');
        });
    });
  });
});
