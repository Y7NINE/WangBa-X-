import 'reflect-metadata';
import { DataSource } from 'typeorm';

const dbType = process.env.DB_TYPE || 'sqlite';

export const AppDataSource =
  dbType === 'sqlite'
    ? new DataSource({
        type: 'better-sqlite3',
        database: process.env.DB_DATABASE || 'netcafe.db',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: process.env.DB_LOGGING === 'true',
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
      })
    : new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'netcafe',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: process.env.DB_LOGGING === 'true',
        ssl: process.env.DB_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
      });

export default AppDataSource;
