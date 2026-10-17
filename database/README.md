# 数据库说明

## 双轨策略

本项目支持两种数据库，**以 TypeORM entities 为唯一真源**：

| 场景 | 数据库 | 配置 | 同步方式 |
|------|--------|------|----------|
| 本地开发 | SQLite (`better-sqlite3`) | `DB_TYPE=sqlite` | `synchronize: true` 自动建表 |
| Docker / 生产 | PostgreSQL 15 | `DB_TYPE=postgres` | 冷启动用 `init.sql`，变更用 migrations |

## 文件说明

- `init.sql` — PostgreSQL 冷启动脚手架（`docker-compose` 挂载到 `/docker-entrypoint-initdb.d/`）。可滞后于 entities，以 entities 为准。
- `backend/src/database/data-source.ts` — TypeORM DataSource，供 `migration:*` 脚本使用。
- `backend/src/database/seed.ts` — 初始化种子数据（admin 账号、测试用户、区域、机器、故障类型）。

## 常用命令

```bash
# 初始化种子数据
cd backend && npm run seed

# 生成迁移
cd backend && npm run migration:generate src/database/migrations/Init

# 执行迁移
cd backend && npm run migration:run

# 回滚迁移
cd backend && npm run migration:revert
```

## 生产建议

- 设置 `DB_SYNCHRONIZE=false`
- 使用 migrations 管理 schema 变更
- `init.sql` 仅作全新环境的表结构脚手架
