# 开发 / 部署手册

## 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18 | 推荐 LTS |
| pnpm | >= 8 | 或 npm |
| Docker | >= 24 | 可选，容器化部署 |
| PostgreSQL | 15 | Docker / 生产使用 |

## 快速开始（本地开发）

### 1. 安装依赖

```bash
# 后端
cd backend && pnpm install

# 管理后台
cd ../frontend && pnpm install

# 用户端
cd ../customer && pnpm install
```

### 2. 配置环境变量

```bash
# 后端
cd backend
cp .env.example .env
# 默认 SQLite，无需额外配置即可启动

# 用户端
cd ../customer
cp .env.example .env
```

### 3. 初始化数据库

```bash
cd backend
npm run seed
# 创建默认管理员 admin / admin123、测试用户、区域、机器、故障类型
```

### 4. 启动服务

```bash
# 终端 1 — 后端 (:3000)
cd backend && npm run start:dev

# 终端 2 — 管理后台 (:5173)
cd frontend && npm run dev

# 终端 3 — 用户端 (:5180)
cd customer && npm run dev
```

### 5. 访问系统

| 服务 | 地址 | 账号 |
|------|------|------|
| 管理后台 | http://localhost:5173 | `admin` / `admin123` |
| 用户端 | http://localhost:5180 | 手机号任意 / 验证码 `123456` |
| Swagger 文档 | http://localhost:3000/api | — |

## Docker 部署

```bash
docker compose up -d --build
```

启动后：

| 服务 | 地址 |
|------|------|
| 管理后台 | http://localhost:80 |
| 用户端 | http://localhost:8080 |
| 后端 API | http://localhost:3000 |
| Swagger | http://localhost:3000/api |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

> Docker 环境使用 PostgreSQL，冷启动脚手架为 `database/init.sql`。

## 端口一览

| 端口 | 服务 | 环境 |
|------|------|------|
| 3000 | 后端 API | 开发 / Docker |
| 5173 | 管理后台 dev | 开发 |
| 5180 | 用户端 dev | 开发 |
| 80 | 管理后台 | Docker |
| 8080 | 用户端 | Docker |
| 5432 | PostgreSQL | Docker |
| 6379 | Redis | Docker |

## 环境变量

### 后端 `backend/.env`

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `DB_TYPE` | sqlite | `sqlite` / `postgres` |
| `DB_DATABASE` | netcafe.db | SQLite 路径 / PG 库名 |
| `DB_HOST` | localhost | PG 主机 |
| `DB_PORT` | 5432 | PG 端口 |
| `DB_USERNAME` | postgres | PG 用户 |
| `DB_PASSWORD` | postgres | PG 密码 |
| `JWT_SECRET` | default-secret | **生产必须修改** |
| `JWT_EXPIRES_IN` | 7d | Token 有效期 |

### 用户端 `customer/.env`

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE` | /api | API 基础路径 |

## 测试

```bash
# 后端单元测试
cd backend && npm test

# 后端 e2e 测试
cd backend && npm run test:e2e

# 管理后台测试
cd frontend && npm test

# 用户端测试
cd customer && npm test
```

## 常见问题

### SQLite vs PostgreSQL 怎么选？

- **本地开发**：默认 SQLite，零配置
- **Docker / 生产**：PostgreSQL，用 `database/init.sql` 冷启动
- Schema 以 TypeORM entities 为准，详见 [database/README.md](../database/README.md)

### 端口被占用？

修改 `backend/.env` 的 `PORT`，或 `vite.config.ts` 的 `server.port`。

### Swagger 打不开？

确保后端已启动，访问 http://localhost:3000/api （注意有 `/api` 路径前缀）。

### 顾客登录验证码是什么？

开发环境固定 `123456`。生产需接入短信服务。

### migration 脚本报错找不到 data-source？

`data-source.ts` 位于 `backend/src/database/data-source.ts`。确保在 `backend` 目录下执行：

```bash
cd backend
npm run migration:run
```
