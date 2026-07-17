import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS配置
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // Swagger文档配置
  const config = new DocumentBuilder()
    .setTitle('网吧综合管理系统 API')
    .setDescription('网吧综合管理系统后端API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', '认证授权')
    .addTag('machines', '机器管理')
    .addTag('areas', '区域管理')
    .addTag('faults', '故障运维')
    .addTag('billing', '计费引擎')
    .addTag('users', '用户管理')
    .addTag('cleaning', '保洁管理')
    .addTag('shifts', '交接班')
    .addTag('bounty', '悬赏任务')
    .addTag('wakeup', '智能唤醒')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`应用运行在: http://localhost:${port}`);
  console.log(`API文档: http://localhost:${port}/api`);
}
bootstrap();
