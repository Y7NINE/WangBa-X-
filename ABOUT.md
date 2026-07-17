# About WangBa-X

## 项目简介

**WangBa-X** 是一套现代化的网吧综合管理与服务系统，专为高端电竞馆和连锁网吧设计。系统采用前后端分离架构，提供管理后台和用户端两个独立应用，实现网吧运营的数字化、智能化管理。

## 项目背景

传统网吧管理系统存在诸多痛点：
- 座位状态无法实时显示，用户体验差
- 故障报修流程繁琐，响应慢
- 交接班账目不清，存在财务漏洞
- 缺乏数据分析，运营决策盲目

WangBa-X 旨在解决这些问题，打造一套**实时、智能、易用**的网吧管理系统。

## 核心特性

### 🎯 实时座位管理
- 可视化座位图，实时显示座位状态
- 支持平面图/列表两种视图切换
- WebSocket实时推送，状态秒级更新

### 🔧 智能故障运维
- 自动监控硬件状态（CPU温度、网络延迟等）
- 玩家一键报修，快速响应
- 故障工单流转闭环，全程可追溯

### 💰 灵活计费引擎
- 支持多种计费策略（按时、包夜、阶梯）
- 会员等级折扣
- 充值赠送活动

### 🧹 保洁状态机
- 下机自动通知保洁
- 清理进度实时显示
- 扫码确认完成

### 📊 数据驱动运营
- 营收趋势分析
- 上座率统计
- 故障率报表
- 时段分布热力图

### 🎮 游戏化运营
- 悬赏任务系统（拉新、驻场、签到）
- 成就徽章体系
- 积分商城

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      用户端 (Vue 3)                      │
│              http://localhost:5180                        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   管理后台 (Vue 3)                        │
│              http://localhost:5173                        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 后端服务 (Nest.js)                        │
│              http://localhost:3000                        │
│         WebSocket + REST API + JWT Auth                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              数据库 (SQLite / PostgreSQL)                 │
└─────────────────────────────────────────────────────────┘
```

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端框架** | Vue 3 + TypeScript | 响应式UI，类型安全 |
| **UI组件库** | Element Plus | 企业级组件，开箱即用 |
| **状态管理** | Pinia | Vue 3官方推荐 |
| **图表库** | ECharts | 数据可视化 |
| **后端框架** | Nest.js | 企业级Node.js框架 |
| **数据库** | SQLite / PostgreSQL | 轻量/生产可选 |
| **实时通信** | Socket.io | WebSocket双向通信 |
| **认证** | JWT | 无状态认证 |
| **构建工具** | Vite | 极速开发体验 |

## 项目结构

```
WangBa-X/
├── backend/              # 后端服务
│   ├── src/
│   │   ├── modules/      # 业务模块
│   │   │   ├── auth/     # 认证授权
│   │   │   ├── machine/  # 机器管理
│   │   │   ├── fault/    # 故障运维
│   │   │   ├── billing/  # 计费引擎
│   │   │   ├── cleaning/ # 保洁管理
│   │   │   ├── shift/    # 交接班
│   │   │   └── bounty/   # 悬赏任务
│   │   └── common/       # 公共模块
│   └── package.json
│
├── frontend/             # 管理后台
│   ├── src/
│   │   ├── views/        # 页面组件
│   │   ├── stores/       # 状态管理
│   │   └── api/          # API封装
│   └── package.json
│
├── customer/             # 用户端
│   ├── src/
│   │   └── views/        # 页面组件
│   └── package.json
│
└── database/             # 数据库脚本
```

## 核心业务流程

### 用户上机流程
```
扫码登录 → 选择座位 → 确认上机 → 开始计费 → 使用设备 → 下机结算
```

### 故障处理流程
```
故障检测 → 自动告警 → 网管接单 → 现场处理 → 完成修复 → 状态更新
```

### 保洁流程
```
用户下机 → 待清理状态 → 通知保洁 → 开始清理 → 清理完成 → 座位空闲
```

## 数据库设计

系统包含以下核心数据表：

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `machines` | 机器信息 | id, area_id, status, ip_address |
| `areas` | 区域信息 | id, name, price_per_hour |
| `users` | 用户信息 | id, nickname, phone, balance |
| `sessions` | 上机记录 | id, user_id, machine_id, start_time |
| `fault_tickets` | 故障工单 | id, machine_id, fault_type, status |
| `cleaning_tasks` | 保洁任务 | id, machine_id, cleaner_id, status |
| `transactions` | 交易记录 | id, user_id, type, amount |

## API接口

### 公开接口（无需认证）
- `GET /machines` - 获取机器列表
- `GET /areas` - 获取区域列表
- `GET /machines/stats` - 获取统计数据

### 认证接口
- `POST /auth/login` - 用户登录
- `GET /auth/profile` - 获取用户信息

### 业务接口
- `POST /billing/sessions` - 开始上机
- `PATCH /billing/sessions/:id/end` - 结束上机
- `POST /faults/tickets` - 创建故障工单
- `PATCH /machines/:id/status` - 更新机器状态

## 部署方式

### 开发环境
```bash
# 后端
cd backend && pnpm install && pnpm run start:dev

# 管理后台
cd frontend && pnpm install && pnpm run dev

# 用户端
cd customer && pnpm install && pnpm run dev
```

### Docker部署
```bash
docker-compose up -d
```

## 测试

```bash
# 后端测试
cd backend && pnpm run test

# 前端测试
cd frontend && pnpm run test
```

## 未来规划

- [ ] 微信小程序版本
- [ ] PC客户端（Electron）
- [ ] 水吧进销存系统
- [ ] 电竞赛事管理
- [ ] AI智能推荐
- [ ] 多店连锁管理

## 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/xxx`)
3. 提交更改 (`git commit -m 'Add feature'`)
4. 推送分支 (`git push origin feature/xxx`)
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

- GitHub: [@Y7NINE](https://github.com/Y7NINE)
- 项目地址: [WangBa-X](https://github.com/Y7NINE/WangBa-X-)

---

**WangBa-X** - 让网吧管理更简单、更智能、更高效。
