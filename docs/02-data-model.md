# 数据模型

以 TypeORM entities 为唯一真源。下图覆盖核心业务表。

## ER 图

```mermaid
erDiagram
    Staff ||--o{ ShiftHandover : "交接"
    User ||--o{ Session : "上机"
    User ||--o{ Transaction : "交易"
    User ||--o{ FaultTicket : "报修"
    User ||--o{ UserTaskProgress : "任务"
    User ||--o{ UserBadge : "徽章"
    User ||--o{ WakeUpConfig : "唤醒"
    Area ||--o{ Machine : "包含"
    Machine ||--o{ Session : "承载"
    Machine ||--o{ FaultTicket : "故障"
    Machine ||--o{ CleaningTask : "保洁"
    FaultType ||--o{ FaultTicket : "分类"
    BountyTask ||--o{ UserTaskProgress : "进度"
    Badge ||--o{ UserBadge : "授予"

    Staff {
        int id PK
        string username UK
        string password
        string name
        string role
        boolean is_on_duty
    }

    User {
        int id PK
        string openid UK
        string phone UK
        string nickname
        decimal balance
        decimal bonus_balance
        int credits
        string member_level
    }

    Area {
        int id PK
        string name
        decimal price_per_hour
        string status
    }

    Machine {
        string id PK
        int area_id FK
        float position_x
        float position_y
        string status
        int current_user_id
        string fault_type
    }

    Session {
        int id PK
        int user_id FK
        string machine_id FK
        datetime start_time
        datetime end_time
        int duration
        decimal amount
        string status
    }

    Transaction {
        int id PK
        int user_id FK
        string type
        decimal amount
        decimal balance_after
        string payment_method
    }

    FaultType {
        string id PK
        string name
        string category
        string default_priority
    }

    FaultTicket {
        string id PK
        string machine_id FK
        string fault_type FK
        string priority
        string status
        datetime accepted_at
        datetime resolved_at
    }

    CleaningTask {
        int id PK
        string machine_id FK
        int cleaner_id
        string status
        datetime started_at
        datetime completed_at
    }

    ShiftHandover {
        int id PK
        int outgoing_staff_id
        int incoming_staff_id
        decimal cash_amount
        string status
    }

    BountyTask {
        int id PK
        string name
        string type
        string reward_type
        int reward_value
    }

    UserTaskProgress {
        int id PK
        int user_id FK
        int task_id FK
        string status
    }

    Badge {
        int id PK
        string name
        string icon
    }

    UserBadge {
        int id PK
        int user_id FK
        int badge_id FK
    }

    WakeUpConfig {
        int id PK
        int user_id FK
        string machine_id FK
        string wake_time
        boolean headphone
        boolean light_strip
        boolean human_wake
    }
```

## 核心表说明

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `staff` | 员工账号 | username, password, role |
| `users` | 顾客 | phone, balance, credits, member_level |
| `areas` | 区域 | name, price_per_hour |
| `machines` | 机器 | id, area_id, status, current_user_id |
| `sessions` | 上机记录 | user_id, machine_id, start_time, amount |
| `transactions` | 交易流水 | user_id, type, amount, payment_method |
| `fault_tickets` | 故障工单 | machine_id, fault_type, priority, status |
| `cleaning_tasks` | 保洁任务 | machine_id, cleaner_id, status |
| `shift_handovers` | 交接班 | outgoing/incoming_staff_id, cash_amount |
| `bounty_tasks` | 悬赏任务 | type, reward_type, reward_value |
| `wake_up_configs` | 唤醒配置 | machine_id, wake_time, headphone/light_strip |

## 座位状态机

```mermaid
stateDiagram-v2
    [*] --> offline
    offline --> online: 上机
    online --> paused: 暂停
    paused --> online: 恢复
    online --> dirty: 下机
    paused --> dirty: 下机
    dirty --> cleaning: 保洁开始
    cleaning --> offline: 保洁完成
    online --> fault: 故障发生
    offline --> fault: 故障发生
    fault --> repairing: 开始维修
    repairing --> offline: 修复完成
    online --> maintenance: 维护中
    maintenance --> offline: 维护完成
```

## 故障工单状态机

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> accepted: 网管接单
    accepted --> processing: 开始处理
    processing --> resolved: 修复完成
    accepted --> transferred: 转移机器
    processing --> transferred: 转移机器
    pending --> cancelled: 取消
    accepted --> cancelled: 取消
    transferred --> pending: 新工单
```

## 保洁状态机

```mermaid
stateDiagram-v2
    [*] --> pending: 下机触发
    pending --> in_progress: 开始清理
    in_progress --> completed: 清理完成
```
