# 联通业务工作台 · 项目参考手册

> 联通新办业务录单、激活跟进、过期补录与经理看板。  
> 罗湖试点跑通后，再扩展其他地区经理团队。  
> 本文档供下次开发前快速查阅。

**最后更新**：2026-07-21（订单修改 / 附件 / 业绩导出 · 详情操作区卡片化 · 本地 Docker PG）

**仓库**：[github.com/Antonio3369/Unicom](https://github.com/Antonio3369/Unicom)  
**本地根目录**：`/Users/xin/projects/Unicom`（应用在 `web/`，说明在本文档）

---

## 1. 项目是什么

| 项 | 说明 |
|---|---|
| 产品名 | **联通业务工作台** |
| 定位 | 内部运营工具（非对外汇报大屏）；Excel 滞后录入 + Web 协作 |
| 业务 | 新办号码开户登记 → 待激活跟进 → 激活/退单/过期 → 按开单人统计业绩 |
| 用户 | 管理员、经理、队员（均可登录；队员可补录） |
| 数据来源 | **现行：Excel 人工上传**（人员名单 + 业绩登记） |
| 试点范围 | **罗湖** 名单与表格；组织按 **经理** 划分，不以公司为租户 |
| 参考项目 | Leadspace-Ali 的 **N7** 工程能力（列表/导入/权限），非考核看板形态 |

**约定**：层级固定为 **管理员 → 经理 → 队员**。罗湖只是部分经理的 `region` 标签，不是独立公司层。

---

## 2. 本阶段停在哪里（2026-07-21）

### 已具备（本地 + GitHub main）

- 路径：`web/`，开发端口 **http://localhost:1771**；`npm run dev` 绑定 `0.0.0.0` 并打印局域网地址供手机同 WiFi 访问
- **本地库**：`docker compose up -d` → PostgreSQL **5433**（见 §4）；`.env` 对齐 `.env.example`
- 认证：角色登录、首登强制改密；**手机局域网登录**勿跳 `localhost`；登录页 DB 不可达时红条提示
- **今日待办**：四卡可点进对应队列；页头 **「＋ 新建业务」**（经理/队员）
- **侧栏**：今日待办 · **新建业务**（经理/队员）· 全部业务 · 业绩复盘 · 导入对账（ADMIN）· 改密
- **全部业务**：待激活未跟进优先 + 筛选（未跟进 / 已跟进 / 今日截止）；双状态徽章（待激活+已过期）
- **新建**（`/orders/new`）：**开单人默认当前登录用户**；经理可改选队员；管理员 **不做 Web 开单**
- **详情 · 操作区**（彩色独立卡片）：
  - **修改订单**（折叠表单）：待激活 / 已过期 / 已完成可改；开单人不可改；改手机号二次确认；经理改队员单写 **OrderEditLog**
  - **保存已激活**（原「确认激活/补录」）：须 **1–3 张激活凭证**；文案统一「保存已激活」
  - **待激活跟进**：计划激活时间 / 原因（仅待激活）
  - **退单**：原因 + 说明（选填）+ **1–3 张沟通记录**；提交后只读
- **已取消**：过期单「重新开单 / `linkedVoidOrderId`」入口（过期一律 **原单修改 + 保存已激活**）
- **业绩复盘**：汇总、补录质量、经理榜（ADMIN）、队员榜、**导出 Excel**（三角色各导各范围，见 §5.4）；**队员下钻页**同样可导出
- **导入对账**（ADMIN）：人员 + 业绩 Excel；预览 API + 上传写入；Seed / `dev:setup`
- **生产**：https://uni.orblead.com · PostgreSQL · redirect 绝对 URL · 过期 cron

### 未做（下次优先看 §14）

- 导入预览页（写入前确认过期/补完成条数）
- 其它地区名单导入体验打磨；同手机号历史提示

**注意**：`data/*.xlsx`、`.env` **不入库**（见根目录 `.gitignore`）。

---

## 3. 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router） |
| 语言 | TypeScript |
| 数据库 | 本地 Docker **PostgreSQL**（5433）+ Prisma 7（`@prisma/adapter-pg`）；生产同 Ali 模式 |
| 认证 | NextAuth.js v5（JWT；middleware 只用 `auth.config`，勿在 Edge 里 import Prisma） |
| 样式 | Tailwind CSS 4 + `src/components/ui/notion.tsx` |
| Excel | xlsx |
| 图表 | recharts（已装，看板暂以数字卡为主） |

---

## 4. 本地开发

**一键（新机器 / 清库后）**：

```bash
cd web
docker compose up -d   # PostgreSQL :5433（须 Docker Desktop 已 Running）
npm run dev:setup      # install → generate → push →（有 web/data 则 seed）→ dev
```

**分步**：

```bash
cd web
docker compose up -d
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed          # 需 web/data/*.xlsx；或管理员页「导入对账」上传
npm run dev              # http://localhost:1771
```

**Docker 注意**：安装 Docker Desktop 后选 **Recommended settings**；Terminal 里应能直接 `docker compose`。若 `command not found`，重开终端或确认 CLI 已装。

### 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | `postgresql://unicom:unicom@localhost:5433/unicom?schema=public`（见 `.env.example`） |
| `AUTH_SECRET` | 生产必改 |
| `PERSONNEL_FILE` | 默认 `./data/罗湖联通业务员名单.xlsx`（相对 `web/`） |
| `ORDERS_FILE` | 默认 `./data/业绩登记模版-上传数据系统.xlsx` |

### 演示账号（密码均为 `123456`）

| 登录名 | 角色 |
|---|---|
| `admin` | 管理员（固定，非拼音） |
| 姓名拼音，如 `linhao` / `dengxiuyun` / `longmin` | 经理 |
| 姓名拼音，如 `zhoujie` | 队员 |

**约定**：经理、队员默认登录名 = **中文名全拼小写**（`pinyin-pro`，无声调）；重名则 `linhao2`…  
密码默认 `123456`；首登 `mustChangePassword=true` → `/settings/password`。  
实现：`src/lib/username.ts`、`personnel-importer.ts`。

**首登改密（对齐 Leadspace.Ali，只改一次）**：
- 强制改密不要求填「当前密码」
- 保存后用新密码 **静默 `signIn`** 刷新 JWT，再进首页
- `jwt` 回调从 DB 同步 `mustChangePassword`，避免中间件仍认为须改密
- 相关：`ChangePasswordForm.tsx`、`api/auth/change-password`、`lib/auth.ts`

### 常用命令

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run expire:run       # 过期批处理（生产建议每日 10:00）
npm run build
```

### 已知坑

| 现象 | 原因 | 处理 |
|---|---|---|
| 页面 500 / Edge fs 报错 | middleware 拉进了 Prisma | middleware 只 `NextAuth(authConfig)`，不要 `export { auth } from "@/lib/auth"` |
| 7/17 全变过期 | Excel `7.17` 曾硬编码年份 2025 | `parseHandleDate` 用**当前年**（见 `src/lib/date-utils.ts`） |
| 端口不对 | 需 `-p 1771` | `package.json` 的 `dev` 脚本已写死 |
| 改 schema 后字段报错 / 500 | Prisma Client 被 dev 进程缓存 | `npm run db:generate` 后**重启** `npm run dev` |
| 一键导入找不到文件 | `.env` 仍指 `../data` | 对齐 `web/data/`，见 `.env.example` |
| 手机登录后空白登录页 | NextAuth 成功 URL 为 `localhost` | 勿设 `AUTH_URL=localhost`；`LoginForm` 跳 `/`；dev 下 `useSecureCookies: false` |
| 登录无提示 / 又回登录页 | 本地 PG 未起 | `docker compose up -d` → `db:push` → `db:seed`；登录页会红条提示 |
| 访问用 `0.0.0.0:1771` | 浏览器/host 异常 | 本机用 **localhost:1771** |

---

## 5. 组织与权限

### 5.1 三级角色

| 角色 | 英文 | 数据范围 | 能力 |
|---|---|---|---|
| 管理员 | ADMIN | 全量 | **仅**导入、看板全量、经理排行；**不做 Web 开单 / 不改单** |
| 经理 | MANAGER | 本队队员 + 自己 | 看本队单、代操作；Web 开单（开单人=本人或队员）；改本队单 **留痕** |
| 队员 | SALES | 自己的单 | Web 录单、修改自己的单、激活、退单、补录 |

### 5.4 业绩导出 Excel（2026-07-21 定稿）

| 项 | 规则 |
|---|---|
| 入口 | `/performance`（当前 `?month=YYYY-MM`）；**队员下钻** `/performance/staff/[id]`（同月 + 当前状态筛选） |
| 谁可导 | **三角色均可**，各导各自数据范围；队员页仅该开单人明细 |
| 列 | 对齐导入模板 + **激活人 / 激活日期 / 激活后台 / 是否曾过期** 等 |
| 手机号 | **不脱敏** |
| 文件名 | 汇总页 `业绩复盘_{月}_{登录人}.xlsx`；队员页 `业绩复盘_{月}_{队员名}[_{状态}].xlsx` |
| 实现 | `GET /api/performance/export?month=&staffId=&staffName=&status=` · `services/order-export.ts` · `PerformanceExportButton` |

### 5.5 附件（2026-07-21 定稿）

| 场景 | 规则 |
|---|---|
| 激活 | 点 **保存已激活** 时 **必填 1–3 张图片**（相册/文件）；提交后只读 |
| 退单 | **确认退单** 时 **必填 1–3 张** + 原因；**退单说明**选填；提交后只读 |
| 存储 | `OrderAttachment`（`ACTIVATION` / `REFUND`）· `uploads/orders/{orderId}/` |
| 权限 | 与看单 scope 一致 |

导入仍 **仅 ADMIN**（经理不可导入 Excel）。

### 5.2 组织模型（勿再加公司层）

```
管理员
  ├── 经理（region 可选：罗湖 / 其他）
  │     └── 队员…
  └── 经理…
```

- **业绩 / 权限边界 = 经理**，不是公司  
- 经理同名风险：一律用 `User.id`，不要用姓名串数据  
- 其它地区：新增经理 + 导该队名单即可，不必建 Company 表

### 5.3 范围实现

`src/services/scope.ts`：`getAccessibleUserIds` / `buildOrderWhere`  
- ADMIN → `null`（全量）  
- MANAGER → 自己 + `managerId = 自己` 的队员  
- SALES → `[自己]`

开单/激活下拉（经理也跑业务时）：  
- `getCreateOpenerOptions` → 新建页开单人（**默认本人** + 队员）  
- `getActivatorOptions` → 详情激活人（本人 + 队员；ADMIN 为全部队员）  
- 经理本人开单时 `Order.managerId = 经理.id`；队员开单时 `managerId = 队员.managerId`

---

## 6. 核心业务规则（已确认，勿误判）

### 6.1 绩效归属

- **永远算开单人**（及所属经理）  
- 开单人 A、激活人 B：绩效仍归 **A**  
- 必须记录：激活人、激活后台（运营核对用）

### 6.2 运营商

- 独立字段 `carrier`：联通 / 移动 / 其他  
- 从备注解析：`联通`、`移动`、`移动/宇飞后台` 等

### 6.3 套餐 / 充值

- **不锁死** 29/39/49 + 200  
- 允许真实业务中的其它金额与套餐（38、79、100、299、500 等）

### 6.4 状态机

```
待激活 ──激活──► 已完成
   │               ▲
   ├──退单────────►│ 已退单（终态）
   │               │
   └──批处理过期──► 已过期 ──原单修改+保存已激活──► 已完成
                      │
                      └──退单（含附件）──► 已退单
```

**新建业务**：全新客户走 `/orders/new`；**不再**从过期单「重新开单」链新单。

### 6.5 过期规则（方案 A）

| 项 | 规则 |
|---|---|
| 业务理解 | 办理后约 72 小时应激活 |
| 系统判定 | 只存办理日 → **办理日 + 2 个自然日** |
| 边界 | 办理日 D → **D、D+1、D+2** 可激活；**D+3 日 10:00** 批处理标过期 |
| 例子（今天=7/19） | 7/17 待激活仍有效；7/16 及更早待激活 → 已过期 |
| 口径 | **以系统为准**（不以口头 72h 争论） |
| 计划激活时间 | 仅跟进用，**不阻止**系统过期 |
| 待激活跟进 | 详情页保存 `planActivateAt` / `pendingReason`，写入 `followUpAt`；列表与详情展示 **已跟进 / 未跟进**（经理/管理员可见本队/全量） |

判定式：`批处理日 > 办理日 + 2 天` → 待激活改为已过期。

实现：`src/lib/order-rules.ts`、`npm run expire:run`、导入时同步跑。

### 6.6 过期后可改状态（工具滞后）

Web 是滞后录入工具，**已过期 ≠ 焊死**：

| 操作 | 谁 | 说明 |
|---|---|---|
| 保存已激活 → 已完成 | 队员/经理 | 须上传激活凭证；文案「保存已激活」 |
| 退单 → 已退单 | 队员/经理 | 须上传沟通记录 |
| 原单修改 + 补录 | 队员/经理 | 过期单改办理日/手机号等后 **保存已激活** |
| Excel 改「已完成」再传 | 运营 | **允许**把已过期升为已完成（见 §8） |

### 6.7 订单修改（2026-07-21 定稿）

| 项 | 规则 |
|---|---|
| 可改状态 | 待激活、已过期、已完成（**已退单**不可改） |
| 可改字段 | 办理日、姓氏、手机号、套餐、充值、运营商、开单后台、备注；**已完成**还可改激活人/后台/激活日 |
| 不可改 | **开单人** |
| 办理日 | 随时可改；**自动重算**待激活↔已过期（**已完成**不因改办理日降状态） |
| 改手机号 | 二次确认 |
| 改单原因 | 选填 |
| 留痕 | **经理改队员单** → `OrderEditLog`（摘要 + 可展开 diff）；队员可见 |
| UI | 详情「修改订单」折叠表单；与「保存已激活 / 跟进 / 退单」分 **彩色卡片** |
| 实现 | `PATCH /api/orders/[id]` `action: edit` · `services/order-edits.ts` |

### 6.8 同手机号

多次过期 / 重办：**只提示、不拦截**（Web 不再提供关联作废单新建）。

补录完成保留 `wasEverExpired=true`，看板可看「过期后补录」质量。

---

## 7. 页面与路由（订单运营台 IA）

产品隐喻：**滞后录单的订单运营台**（非 N7 式考核跟进）。  
日常先处理风险，业绩复盘为二级入口。

| 路径 | 说明 |
|---|---|
| `/login` | 登录 |
| `/settings/password` | 改密 / 首登强制改密 |
| `/` | **今日待办**：顶部四卡可滚动定位；①今日截止 ②其余待激活 ③过期待补录 ④本月已完成 |
| `/orders` | **全部业务**；待激活：未跟进优先排序，可筛跟进状态 / 今日截止 |
| `/orders/new` | **新建业务**（经理/队员；开单人默认登录用户） |
| `/orders/[id]` | 详情：修改 / **保存已激活** / 跟进 / 退单；附件与修改记录只读展示 |
| `/performance` | **业绩复盘** + **导出 Excel**；汇总、补录质量、经理榜（ADMIN）、队员榜 |
| `/performance/staff/[id]` | 队员下钻（点排名姓名）：个人指标 + 业务明细（可按状态筛）+ **导出 Excel** |
| `/performance/orders` | 复盘下钻列表（补录质量「已完成 / 仍过期」）；带「← 业绩复盘」，**勿**链到 `/orders` |
| `/admin/import` | **导入对账**（仅 ADMIN）；Tab：人员/业绩上传（沙箱可直接传 Excel）+ 本地 data |
| `/follow-up` | 重定向到 `/`（兼容旧链） |

侧栏：今日待办 · **新建业务**（MANAGER/SALES）· 全部业务 · 业绩复盘 · 导入对账（ADMIN）· 修改密码。

### 7.1 业绩复盘交互约定

| 点 | 约定 |
|---|---|
| 月份 | 页头 `?month=YYYY-MM`（默认当月）；汇总卡、经理/队员榜、下钻列表均按**办理日**过滤 |
| 人员排名 | `getStaffRanking`：按开单人已完成优先，再按总量；范围随角色 |
| 「所属经理」列 | **仅 ADMIN** 全员榜显示；经理/队员视角本队已锁定，不显示 |
| 点队员名 | → `/performance/staff/[id]`（越权 `notFound`）；页头 **导出 Excel** 导出该队员当月明细（随状态 Tab） |
| 补录质量入口 | → `/performance/orders?status=COMPLETED\|EXPIRED`，返回业绩复盘 |
| 今日待办四卡 | `QueueStatCard` 在 `#app-scroll` 内 smooth 滚到对应 `id` 区块 |

---

## 8. Excel 导入规则

### 8.1 文件

```
unicom/data/
  罗湖联通业务员名单.xlsx    # 业务员 | 所属经理
  业绩登记模版-上传数据系统.xlsx
    # 办理日期 | 业务员 | 客户名称 | 办理手机号 | 套餐类型 | 充值金额 | 状态 | 所属经理 | 备注
```

顺序：**先人员名单，再业绩**。

### 8.2 办理日解析

Excel 多为 `7.17`（无年）→ `src/lib/date-utils.ts` 落到**当前年**。  
跨年边界：若月比当前月大很多（如 1 月遇到 12.x），视为去年。

### 8.3 去重主键

`importKey = 手机号_办理日_开单人Id`

### 8.4 重导状态策略（2026-07-19 定稿）

| Excel 状态 | 系统原状态 | 结果 |
|---|---|---|
| 已完成 | 待激活 | → 已完成 |
| **已完成** | **已过期** | → **已完成**（补录；`wasEverExpired` 保留；`lateEntryNote` 记 Excel 补录） |
| 待激活 | 已过期 | 仍过期（可更新备注/套餐等） |
| 任意 | 已完成 / 已退单 | **跳过，不覆盖** |
| 待激活（未过期） | 待激活 | 更新字段；若已超办理日+2 → 标过期 |

完成时默认：激活人=开单人，激活日=办理日，激活后台=备注中的「XX后台」。

实现：`src/services/import/orders-importer.ts`

### 8.5 备注解析

- 含「移动」→ 运营商 MOBILE；含「联通」→ UNICOM  
- 匹配 `XX后台` → 开单/激活后台  
- 其余进自由备注

---

## 9. 数据模型要点

Schema：`web/prisma/schema.prisma`

| 模型 | 说明 |
|---|---|
| `User` | ADMIN / MANAGER / SALES；`managerId`；`region`（经理可选） |
| `Order` | 业务单；`openerId` 绩效；激活/过期/退单字段；`linkedVoidOrderId` 仅历史数据 |
| `OrderAttachment` | 激活凭证 / 退单沟通记录（`ACTIVATION` / `REFUND`） |
| `OrderEditLog` | 经理改队员单留痕（`changes` JSON） |
| `BackendDict` | 后台字典 |
| `ImportLog` / `AnomalyRecord` | 导入批次与异常行 |

---

## 10. 关键文件索引

```
unicom/
├── Leadspace.Unicom.md       # ★ 本手册
├── data/*.xlsx               # 本地样例，不入库
└── web/
    ├── README.md
    ├── prisma/schema.prisma
    └── src/
        ├── app/(dashboard)/
        │   ├── page.tsx                 # 今日待办
        │   ├── orders/ …                # 全部业务 / 新建 / 详情
        │   ├── performance/
        │   │   └── …                    # 含 PerformanceExportButton
        │   └── admin/import/
        ├── components/
        │   ├── layout/AppShell.tsx      # 侧栏含「新建业务」
        │   ├── orders/OrderDetailActions.tsx  # ★ 操作卡片 UI
        │   ├── orders/OrderEditHistory.tsx · OrderAttachmentPicker.tsx
        │   └── …
        ├── lib/
        │   ├── order-edits.ts · order-attachments.ts · db-health.ts
        │   └── …
        └── services/
            ├── order-export.ts          # 业绩 Excel
            ├── order-edits.ts · order-attachments.ts
            ├── orders.ts                # activate/refund 含附件
            └── import/…
```

---

## 11. 指标口径

| 指标 | 口径 | 出现位置 |
|---|---|---|
| 总办理 / 待激活 / 已完成 / 已过期 / 已退单 | 可见范围内按 `status` | 业绩复盘、队员下钻 |
| 完成率 / 过期率 | 已完成÷总量、已过期÷总量 | 业绩复盘 |
| 过期后补录完成 | `COMPLETED && wasEverExpired` | 补录质量卡、排名「过期补录」列 |
| 本月经理排行榜 | 本队开单人汇总 · **办理日落所选月**（`?month=YYYY-MM`）；已完成优先排序 | 业绩复盘（仅 ADMIN） |
| 本月队员排行榜 | 开单人维度 · **办理日落所选月**；完成优先再总量 | 业绩复盘 |
| 今日截止 | 待激活且 `daysUntilExpire <= 0` | 今日待办 |
| 本月已完成 | `COMPLETED` 且激活日（无则办理日）落在当月 | 今日待办 ④ |

---

## 12. 与 Leadspace.Ali（N7）对照

| 仍借用的工程能力 | 已刻意不跟的产品形态 |
|---|---|
| Notion UI、权限 scope、Excel 导入框架 | N7：看板 → 经理 → 队员 → 设备 |
| 登录 / 改密 / middleware 注意点 | 考核 P0–P3、达标率色块首页 |
| — | 联通首页 = **工作队列**，业绩在 `/performance` |

小蓝环风控 / 商机逻辑不适用。

---

## 13. 开发约定

1. 改 UI 优先复用 `notion.tsx`  
2. 统计/列表必须走 `buildOrderWhere`，防越权  
3. middleware **禁止** import `@/lib/auth`（会拖进 Prisma）  
4. Excel 办理日无年时用 `date-utils`，勿再硬编码 2025  
5. 过期 / 补录 / 开单人绩效规则变更时，**同步更新本文档**  
6. 不主动 commit / 部署，除非用户明确要求  

---

## 14. 后续待办

| 优先级 | 内容 |
|---|---|
| ~~P1~~ | ~~首次上线 https://uni.orblead.com~~（2026-07-20） |
| ~~P1~~ | ~~每日 10:00 过期 cron~~ |
| ~~P2~~ | ~~业绩复盘导出 Excel~~（2026-07-21） |
| ~~P2~~ | ~~激活/退单附件上传~~（2026-07-21） |
| ~~P2~~ | ~~Web 订单修改 + 取消重新开单~~（2026-07-21） |
| P2 | 导入预览页（写入前确认过期/补完成条数） |
| P3 | 其它地区经理名单导入体验；同手机号历史提示 |
| P3 | 套餐/运营商分布图（recharts 已装未用） |
| 待部署 | 上述 2026-07-21 功能需同步生产（`db push` + 重建 app） |

---

## 15. 生产部署规范

### 15.1 线上环境

| 项 | 值 |
|---|---|
| **访问地址** | **https://uni.orblead.com** |
| 服务器 | 腾讯云轻量，与 **ali.orblead** / **hk.orblead** 共用（`43.136.25.181`） |
| SSH 别名 | `sales-cloud`（`~/.ssh/config`） |
| 项目目录 | `/opt/leadspace-unicom` |
| 应用容器 | `leadspace-unicom-app` → `127.0.0.1:3002` |
| 数据库 | Docker **PostgreSQL 16**（`leadspace-unicom-postgres`，独立 volume） |
| 上传目录 | Docker volume `/app/uploads` |
| Nginx 配置 | `/etc/nginx/conf.d/uni-orblead.conf` |
| 兄弟服务 | ali `:3001`、hk `:3080`，互不影响 |

### 15.2 DNS（上线前）

在腾讯云 DNS 为 **uni.orblead.com** 添加 **A 记录** → `43.136.25.181`，生效后再跑 SSL。

### 15.3 发布流程（须遵守）

```
1. 本地改代码
2. cd web && npm run build
3. npm run dev + 浏览器点验
4. 负责人确认「可以部署」
5. cd web && ./deploy/push-and-deploy.sh
6. 首次：ssh sales-cloud 'cd /opt/leadspace-unicom && ./deploy/setup-ssl.sh'
7. 首次：ssh sales-cloud 'cd /opt/leadspace-unicom && ./deploy/install-expire-cron.sh'
8. 线上抽查 https://uni.orblead.com
```

服务器 `.env` 必含：

```env
AUTH_SECRET=...
AUTH_URL=https://uni.orblead.com
```

**勿**在生产写 `AUTH_URL=http://localhost:...`。

### 15.4 部署命令

```bash
cd web
npm run build
./deploy/push-and-deploy.sh

# 仅重建应用
ssh sales-cloud 'cd /opt/leadspace-unicom && sudo docker compose -f docker-compose.prod.yml up -d --build app'

# 首次灌样例数据（需先把 xlsx 放到服务器 web/data/）
ssh sales-cloud 'cd /opt/leadspace-unicom && RUN_DB_SEED=1 ./deploy/server-deploy.sh'
```

相关文件：

```
web/deploy/
├── push-and-deploy.sh
├── server-deploy.sh
├── setup-ssl.sh
├── install-expire-cron.sh
├── env.production.example
└── nginx/uni.orblead.com.conf
web/Dockerfile
web/docker-compose.prod.yml
```

### 15.5 部署后检查

- [x] https://uni.orblead.com/login 可打开
- [x] `admin` / 经理 / 队员登录正常（redirect 须返回绝对 URL，见 `auth.config.ts`）
- [x] `sudo docker ps`：`leadspace-unicom-app`、`leadspace-unicom-postgres` Up
- [x] ali.orblead.com、hk.orblead.com 仍正常

---

## 16. 快速定位问题

| 问题 | 先看 |
|---|---|
| 登录 / Session | `auth.ts`, `auth.config.ts`（redirect 勿返回相对 `/`）, `LoginForm.tsx` |
| 经理开单 | `NewOrderForm.tsx`, `scope.ts`, `orders.ts`（`createOrder`） |
| 订单修改 | `order-edits.ts`, `OrderDetailActions.tsx`, `PATCH action:edit` |
| 激活 / 退单 + 附件 | `POST .../activate`, `POST .../refund`, `order-attachments.ts` |
| 业绩导出 | `order-export.ts`, `/api/performance/export`, `PerformanceExportButton`（汇总页 + 队员下钻） |
| 激活人下拉 | `scope.ts`（`getActivatorOptions`） |
| 过期对不对 | `order-rules.ts`, `date-utils.ts`, seed 年份 |
| Excel 补完成 | `orders-importer.ts` §8.4 |
| 权限越权 | `scope.ts`, `permissions.ts` |
| 导入失败 | `personnel-importer.ts`, `orders-importer.ts`, `/admin/import` |
| 用户看到技术报错 | `src/lib/api-error.ts`（`toUserError` 过滤 Prisma/堆栈；业务 Error 原样返回） |
| 返回错页 / 滚丢 | `HistoryBackLink.tsx`, `mainScroll.ts`, `ScrollMemory.tsx` |
| 人员排名 / 下钻 | `scope.ts`（`getStaffRanking` / `getStaffPerformance`）、`performance/*` |
| 部署 / 域名 | `web/deploy/`、`docker-compose.prod.yml`、`Leadspace.Unicom.md` §15 |

---

## 17. Git / 推送说明

```bash
cd /Users/xin/projects/Unicom
git remote -v   # git@github.com:Antonio3369/Unicom.git
```

勿提交：`web/.env`、`web/uploads/`、`data/*.xlsx`。

---

*架构或产品约定变更时，请同步更新本文档与 `web/README.md`。*
