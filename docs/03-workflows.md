# 核心业务流程

> 文档状态（2026-10-21）：下文保留早期模型、流程或截图记录，测试数字与待办可能已变化。当前实现、验证与部署边界以[项目能力](project-showcase.md)、[架构](01-architecture.md)和[验证报告](validation-report.md)为准。


## 用户上机 → 下机结算

```mermaid
sequenceDiagram
    actor U as 顾客
    participant C as 用户端
    participant API as 后端
    participant DB as 数据库

    U->>C: 选择空闲座位
    C->>API: POST /billing/sessions
    API->>DB: 创建 Session (status=active)
    API->>DB: Machine.status = online
    API-->>C: 返回 session
    C-->>U: 上机成功，开始计费

    loop 使用中
        API->>DB: 更新 duration / amount
    end

    U->>C: 暂停
    C->>API: PATCH /billing/sessions/:id/pause
    API-->>C: 已暂停

    U->>C: 恢复
    C->>API: PATCH /billing/sessions/:id/resume
    API-->>C: 已恢复

    U->>C: 下机
    C->>API: PATCH /billing/sessions/:id/end
    API->>DB: Session.status = completed
    API->>DB: Machine.status = dirty
    API->>DB: 创建 CleaningTask (pending)
    API->>DB: 写入 Transaction (consume)
    API-->>C: 结算金额
    C-->>U: 显示消费明细
```

## 故障处理流程

```mermaid
sequenceDiagram
    actor U as 顾客/系统
    participant API as 后端
    actor S as 网管
    participant M as 管理端

    U->>API: POST /faults/tickets
    API->>API: 生成工单 (pending)
    API-->>S: WebSocket 推送告警

    S->>M: 查看故障列表
    S->>API: PATCH /faults/tickets/:id/accept
    API->>API: status = accepted

    S->>API: PATCH /faults/tickets/:id/resolve
    API->>API: status = resolved
    API-->>U: 故障已修复
```

## 保洁流程

```mermaid
sequenceDiagram
    actor C as 保洁员
    participant M as 管理端
    participant API as 后端

    Note over API: 用户下机自动生成 CleaningTask
    C->>M: 查看待清理列表
    C->>API: POST /cleaning/tasks/:id/start
    API->>API: task.status = in_progress
    API->>API: machine.status = cleaning

    C->>API: POST /cleaning/tasks/:id/complete
    API->>API: task.status = completed
    API->>API: machine.status = offline
    API-->>C: 座位已恢复空闲
```

## 交接班流程

```mermaid
sequenceDiagram
    actor A as 交班员工
    actor B as 接班员工
    participant M as 管理端
    participant API as 后端

    A->>M: 发起交接班
    M->>API: POST /shifts
    API-->>M: 盲审核对金额

    B->>M: 确认接班
    API->>API: ShiftHandover.status = completed
    API-->>B: 交接完成
```

## 顾客登录

```mermaid
sequenceDiagram
    actor U as 顾客
    participant C as 用户端
    participant API as 后端

    U->>C: 输入手机号
    C->>API: POST /auth/customer/login {phone, code}
    API->>API: 校验验证码 (dev: 123456)
    alt 用户不存在
        API->>API: 自动注册
    end
    API-->>C: {token, user}
    C->>C: 存储 customer_token
    C-->>U: 登录成功
```
