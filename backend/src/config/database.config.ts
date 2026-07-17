import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const dbType = configService.get('DB_TYPE', 'sqlite');
  
  if (dbType === 'sqlite') {
    return {
      type: 'better-sqlite3',
      database: configService.get('DB_DATABASE', 'netcafe.db'),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
    };
  }

  return {
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD', 'postgres'),
    database: configService.get('DB_DATABASE', 'netcafe'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: configService.get('DB_SYNCHRONIZE', true),
    logging: configService.get('DB_LOGGING', false),
    ssl: configService.get('DB_SSL', false)
      ? { rejectUnauthorized: false }
      : false,
  };
};
