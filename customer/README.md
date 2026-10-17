# WangBa-X 顾客端

推荐在项目根目录统一启动后端、管理端和顾客端：

```powershell
npm run setup:local
npm run dev:local
```

打开 http://127.0.0.1:5180。演示账号13800138001，验证码123456；首次初始化有300元演示余额。新注册账号余额为0，可由本地演示店长记账充值。固定验证码只在非生产演示模式启用，不发送短信。

选座支持大厅示意、区域筛选和列表切换。布局仅供参考，实际位置以门店为准。其他入口包括点单、报修、账户及历史记录。

单独调试此端可执行`npm run dev --prefix customer`，仍需后端运行在3000端口。

- 测试：`npm test --prefix customer`
- 完整类型检查与构建：`npm run build --prefix customer`
- 运行与验收：[本地仿真操作手册](../docs/06-local-simulation.md)
- 截图与界面说明：[大厅选座与水墨管理端](../docs/07-hall-ink-admin.md)
