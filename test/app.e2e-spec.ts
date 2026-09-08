import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('userCount');
      });
  });

  it('should rate limit /auth/login after 5 attempts with 429 Too Many Requests', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 5; i++) {
      await request(server)
        .post('/auth/login')
        .send({ email: 'ratelimit_test@example.com', password: 'wrongpassword' })
        .expect((res) => {
          expect(res.status).not.toBe(429);
        });
    }

    // 6th attempt must be rejected with 429
    await request(server)
      .post('/auth/login')
      .send({ email: 'ratelimit_test@example.com', password: 'wrongpassword' })
      .expect(429);
  });

  afterAll(async () => {
    await app.close();
  });
});

