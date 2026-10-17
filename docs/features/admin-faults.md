# 故障管理

![故障管理](../../网吧管理系统效果图/故障管理.png)

## 能力说明

故障工单全生命周期管理：自动检测 + 主动上报 + 人工录入。工单流转可追溯，支持优先级筛选与超时告警。

## 界面标注

① **筛选栏** — 按状态/优先级/故障类型筛选<br>
② **工单列表** — 工单号、机器、类型、优先级、状态、处理人、时间<br>
③ **操作** — 接单、处理完成、转移机器、查看详情<br>
④ **新建工单** — 手动录入故障

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/faults/tickets` | 工单列表 |
| POST | `/faults/tickets` | 创建工单 |
| PATCH | `/faults/tickets/:id/accept` | 接单 |
| PATCH | `/faults/tickets/:id/resolve` | 处理完成 |
| PATCH | `/faults/tickets/:id/transfer` | 转移机器 |
| GET | `/faults/types` | 故障类型字典 |
