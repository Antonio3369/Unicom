# 联通业务工作台 · 项目参考手册

> 联通新办业务录单、激活跟进、过期补录与经理看板。  
> 罗湖试点跑通后，再扩展其他地区经理团队。  
> 本文档供下次开发前快速查阅。

**最后更新**：2026-07-19（业绩复盘人员排名/下钻、今日待办卡片跳转、补录列表返回链路；代码已推 GitHub）

**仓库**：[github.com/Antonio3369/Unicom](https://github.com/Antonio3369/Unicom)  
**本地根目录**：`/Users/Eric/Desktop/agent/unicom`（应用在 `web/`，说明在本文档）

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

## 2. 本阶段停在哪里（2026-07-19）

### 已具备（本地 + GitHub main）

- 路径：`unicom/web`，开发端口 **http://localhost:1771**
- 认证：角色登录、首登强制改密（静默 re-login）、密码显示切换
- **今日待办**：四卡可点进对应队列；①今日截止 ②其余待激活 ③过期待补录 ④今日新开
- **全部业务** / 新建 / 详情（激活、补录、退单、跟进、重办）；后台名可下拉+手输（`BackendDict`）
- **业绩复盘**：汇总卡、补录质量、经理排行（ADMIN）、**人员明细排名**、队员下钻、补录列表下钻
- **导入对账**（ADMIN）：人员 + 业绩 Excel；Seed 可导罗湖样例
- 滚动：`#app-scroll` + `ScrollMemory` / `HistoryBackLink`（详情返回列表位置）

### 未做（下次优先看 §14）

- 生产部署、每日 10:00 过期 cron
- 导出 Excel、退单附件、导入预览向导
- 其它地区名单导入体验打磨

**注意**：`data/*.xlsx`、`.env`、`dev.db` **不入库**（见根目录 `.gitignore`）。

---

## 3. 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router） |
| 语言 | TypeScript |
| 数据库 | SQLite + Prisma 7（`@prisma/adapter-better-sqlite3`） |
| 认证 | NextAuth.js v5（JWT；middleware 只用 `auth.config`，勿在 Edge 里 import Prisma） |
| 样式 | Tailwind CSS 4 + `src/components/ui/notion.tsx` |
| Excel | xlsx |
| 图表 | recharts（已装，看板暂以数字卡为主） |

---

## 4. 本地开发

```bash
cd /Users/Eric/Desktop/agent/unicom/web
npm install
cp .env.example .env
npm run db:push
npm run db:seed          # 清空后需自行 delete + seed，或管理员页「导入罗湖数据」
npm run dev              # http://localhost:1771
```

### 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | 默认 `file:./dev.db` |
| `AUTH_SECRET` | 生产必改 |
| `PERSONNEL_FILE` | 默认 `../data/罗湖联通业务员名单.xlsx` |
| `ORDERS_FILE` | 默认 `../data/业绩登记模版-上传数据系统.xlsx` |

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

---

## 5. 组织与权限

### 5.1 三级角色

| 角色 | 英文 | 数据范围 | 能力 |
|---|---|---|---|
| 管理员 | ADMIN | 全量 | 导入、看板全量、经理排行 |
| 经理 | MANAGER | 本队队员 + 自己 | 看本队单、可代操作 |
| 队员 | SALES | 自己的单 | 录单、激活、退单、**补录** |

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
   └──批处理过期──► 已过期 ──补录激活 / Excel 已完成──► 已完成
                      │
                      └──补录退单──► 已退单
                      └──重新开单──► 新单（可选关联旧单）
```

### 6.5 过期规则（方案 A）

| 项 | 规则 |
|---|---|
| 业务理解 | 办理后约 72 小时应激活 |
| 系统判定 | 只存办理日 → **办理日 + 2 个自然日** |
| 边界 | 办理日 D → **D、D+1、D+2** 可激活；**D+3 日 10:00** 批处理标过期 |
| 例子（今天=7/19） | 7/17 待激活仍有效；7/16 及更早待激活 → 已过期 |
| 口径 | **以系统为准**（不以口头 72h 争论） |
| 计划激活时间 | 仅跟进用，**不阻止**系统过期 |

判定式：`批处理日 > 办理日 + 2 天` → 待激活改为已过期。

实现：`src/lib/order-rules.ts`、`npm run expire:run`、导入时同步跑。

### 6.6 过期后可改状态（工具滞后）

Web 是滞后录入工具，**已过期 ≠ 焊死**：

| 操作 | 谁 | 说明 |
|---|---|---|
| 补录激活 → 已完成 | 队员可操作 | 详情页「补录激活」 |
| 补录退单 → 已退单 | 队员可操作 | 与正常退单同字段 |
| 重新开单 | 可选关联旧单 | 真新业务；办理日默认今天 |
| Excel 改「已完成」再传 | 运营 | **允许**把已过期升为已完成（见 §8） |

补录完成保留 `wasEverExpired=true`，看板可看「过期后补录」质量。

### 6.7 同手机号

多次过期 / 重办：**只提示、不拦截**（可选关联作废单号）。

---

## 7. 页面与路由（订单运营台 IA）

产品隐喻：**滞后录单的订单运营台**（非 N7 式考核跟进）。  
日常先处理风险，业绩复盘为二级入口。

| 路径 | 说明 |
|---|---|
| `/login` | 登录 |
| `/settings/password` | 改密 / 首登强制改密 |
| `/` | **今日待办**：顶部四卡可滚动定位；①今日截止 ②其余待激活 ③过期待补录 ④今日新开 |
| `/orders` | **全部业务**（检索筛选，非主工作面） |
| `/orders/new` | 新建业务（`?linkedVoidOrderId=` 重办） |
| `/orders/[id]` | 详情：激活 / 补录 / 退单 / 跟进 / 重办；`HistoryBackLink` + 滚动记忆 |
| `/performance` | **业绩复盘**：汇总、补录质量、经理排行（ADMIN）、人员明细排名 |
| `/performance/staff/[id]` | 队员下钻（点排名姓名）：个人指标 + 业务明细（可按状态筛） |
| `/performance/orders` | 复盘下钻列表（补录质量「已完成 / 仍过期」）；带「← 业绩复盘」，**勿**链到 `/orders` |
| `/admin/import` | **导入对账**（仅 ADMIN） |
| `/follow-up` | 重定向到 `/`（兼容旧链） |

侧栏：今日待办 · 全部业务 · 新建业务 · 业绩复盘（含 `/performance/*`）· 导入对账（ADMIN）· 修改密码。

### 7.1 业绩复盘交互约定

| 点 | 约定 |
|---|---|
| 人员排名 | `getStaffRanking`：按开单人已完成优先，再按总量；范围随角色 |
| 「所属经理」列 | **仅 ADMIN** 全员榜显示；经理/队员视角本队已锁定，不显示 |
| 点队员名 | → `/performance/staff/[id]`（越权 `notFound`） |
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
| `Order` | 业务单；`openerId` 绩效；`activatorId` / `activateBackend` 激活事实；`wasEverExpired` / `expiredAt` / `lateEntryNote` |
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
        │   │   ├── page.tsx             # 业绩复盘
        │   │   ├── staff/[id]/page.tsx # 队员下钻
        │   │   └── orders/page.tsx      # 复盘侧业务列表
        │   └── admin/import/
        ├── components/
        │   ├── layout/AppShell.tsx · ScrollMemory.tsx
        │   ├── orders/QueueTable.tsx · QueueStatCard.tsx · OrderDetailActions.tsx
        │   └── ui/notion.tsx · HistoryBackLink.tsx · BackendComboInput.tsx
        ├── lib/
        │   ├── auth.ts / auth.config.ts / mainScroll.ts
        │   ├── order-rules.ts           # ★ 过期判定
        │   ├── date-utils.ts            # ★ 办理日解析（当前年）
        │   └── permissions.ts · db.ts · username.ts
        └── services/
            ├── scope.ts                 # ★ 权限 + 经理排行 + 人员排名/下钻
            ├── orders.ts                # 队列 getWorkQueues、CRUD
            └── import/…
```

---

## 11. 指标口径

| 指标 | 口径 | 出现位置 |
|---|---|---|
| 总办理 / 待激活 / 已完成 / 已过期 / 已退单 | 可见范围内按 `status` | 业绩复盘、队员下钻 |
| 完成率 / 过期率 | 已完成÷总量、已过期÷总量 | 业绩复盘 |
| 过期后补录完成 | `COMPLETED && wasEverExpired` | 补录质量卡、排名「过期补录」列 |
| 经理排行 | 按开单人所属经理汇总 | 业绩复盘（仅 ADMIN） |
| 人员明细排名 | 开单人维度；完成优先再总量 | 业绩复盘 |
| 今日截止 | 待激活且 `daysUntilExpire <= 0` | 今日待办 |
| 今日新开 | `handleDate = 今天` | 今日待办 |

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
| P1 | 生产部署（库可换 PostgreSQL） |
| P1 | 每日 10:00 过期 cron（`npm run expire:run`） |
| P2 | 列表导出 Excel |
| P2 | 退单沟通记录附件上传 |
| P2 | 导入预览页（写入前确认过期/补完成条数） |
| P3 | 其它地区经理名单导入体验；同手机号历史提示 |
| P3 | 套餐/运营商分布图（recharts 已装未用） |

---

## 15. 快速定位问题

| 问题 | 先看 |
|---|---|
| 登录 / Session | `auth.ts`, `auth.config.ts`, `middleware.ts` |
| 过期对不对 | `order-rules.ts`, `date-utils.ts`, seed 年份 |
| Excel 补完成 | `orders-importer.ts` §8.4 |
| 权限越权 | `scope.ts`, `permissions.ts` |
| 导入失败 | `personnel-importer.ts`, `orders-importer.ts`, `/admin/import` |
| 返回错页 / 滚丢 | `HistoryBackLink.tsx`, `mainScroll.ts`, `ScrollMemory.tsx` |
| 人员排名 / 下钻 | `scope.ts`（`getStaffRanking` / `getStaffPerformance`）、`performance/*` |
| 待办卡片不跳 | `QueueStatCard.tsx`、首页 `#queue-*` id |

---

## 16. Git / 推送说明

```bash
cd /Users/Eric/Desktop/agent/unicom
git remote -v   # git@github.com:Antonio3369/Unicom.git
git push
```

本机 SSH 使用 `~/.ssh/id_ed25519_air`（`~/.ssh/config` 中 `Host github.com`）。  
勿提交：`web/.env`、`web/dev.db`、`data/*.xlsx`。

---

*架构或产品约定变更时，请同步更新本文档与 `web/README.md`。*
