# 系统架构

WangBa-X 采用前后端分离架构，由三端 + 一个后端服务组成。

## 整体架构

```mermaid
flowchart TB
    subgraph Client["客户端"]
        Admin["管理后台<br/>Vue 3 + Element Plus<br/>localhost:5173"]
        Customer["用户端<br/>Vue 3 + Element Plus<br/>localhost:5180"]
    end

    subgraph Server["后端服务 NestJS"]
        API["REST API<br/>localhost:3000"]
        WS["WebSocket<br/>Socket.IO"]
        Swagger["Swagger 文档<br/>/api"]
    end

    subgraph Data["数据层"]
        SQLite["SQLite<br/>开发环境"]
        PG["PostgreSQL<br/>Docker / 生产"]
        Redis["Redis<br/>缓存"]
    end

    Admin -->|HTTP + JWT| API
    Customer -->|HTTP + JWT| API
    Admin <-->|Socket.IO| WS
    Customer <-->|Socket.IO| WS
    API --> SQLite
    API --> PG
    API --> Redis
    WS --> Redis
    Swagger -.-> API
```

## 后端模块

```mermaid
flowchart LR
    subgraph Core["核心模块"]
        Auth["auth<br/>认证授权"]
        User["user<br/>用户/员工"]
        Area["area<br/>区域"]
        Machine["machine<br/>机器"]
    end

    subgraph Biz["业务模块"]
        Billing["billing<br/>计费"]
        Fault["fault<br/>故障"]
        Cleaning["cleaning<br/>保洁"]
        Shift["shift<br/>交接班"]
        Bounty["bounty<br/>悬赏"]
        Wakeup["wakeup<br/>唤醒"]
        Analytics["analytics<br/>统计"]
        Setting["setting<br/>设置"]
        Order["order<br/>点单"]
    end

    Auth --> User
    Billing --> Machine
    Fault --> Machine
    Cleaning --> Machine
    Analytics --> Billing
    Analytics --> Fault
    Analytics --> Machine
```

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 管理后台 | Vue 3 + TypeScript + Element Plus | 收银台/管理端 |
| 用户端 | Vue 3 + TypeScript + Element Plus | 顾客自助端 |
| 状态管理 | Pinia | Vue 3 官方推荐 |
| 图表 | ECharts | 数据可视化 |
| 后端框架 | Nest.js | 企业级 Node.js |
| ORM | TypeORM | entities 为唯一真源 |
| 数据库 | SQLite / PostgreSQL | 开发/生产双轨 |
| 实时通信 | Socket.IO | 状态秒级推送 |
| 认证 | JWT | 员工/顾客双主体 |
| 构建 | Vite | 极速开发体验 |

## 双数据库策略

| 场景 | 数据库 | 同步方式 |
|------|--------|----------|
| 本地开发 | SQLite | `synchronize: true` 自动建表 |
| Docker / 生产 | PostgreSQL | `init.sql` 冷启动 + migrations |

详见 [database/README.md](../database/README.md)。
