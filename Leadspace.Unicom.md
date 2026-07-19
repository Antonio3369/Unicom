# 联通业务工作台 · 项目参考手册

> 联通新办业务录单、激活跟进、过期补录与经理看板。  
> 罗湖试点跑通后，再扩展其他地区经理团队。  
> 本文档供下次开发前快速查阅。

**最后更新**：2026-07-19（产品方向：订单运营台 / 今日待办优先，不再按 N7 考核看板组织）

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
| 参考项目 | [Leadspace-Ali](../../../projects/Leadspace-Ali) 的 **N7** 板块（列表/跟进/导入），非小蓝环风控逻辑 |

**约定**：层级固定为 **管理员 → 经理 → 队员**。罗湖只是部分经理的 `region` 标签，不是独立公司层。

---

## 2. 本阶段停在哪里（2026-07-19）

### 已上线到本地

- 路径：`/Users/Eric/Desktop/agent/unicom/web`
- 开发端口：**http://localhost:1771**
- Seed 可导入罗湖两份 Excel；看板 / 列表 / 待跟进 / 详情操作 / 导入页可用

### 今晚不做

- 生产部署
- 导出 Excel、消息提醒
- 其它地区经理名单批量导入 UI 打磨
- 沟通记录附件上传（退单字段有，附件流程未做细）

下次接着做时优先看 §14。

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
| `/` | **今日待办**：今日截止 → 其余待激活 → 过期待补录 |
| `/orders` | **全部业务**（检索筛选，非主工作面） |
| `/orders/new` | 新建业务（`?linkedVoidOrderId=` 重办） |
| `/orders/[id]` | 详情：激活 / 补录 / 退单 / 跟进 / 重办；返回用 `HistoryBackLink` + `#app-scroll` 滚动记忆 |
| `/performance` | **业绩复盘**（完成率、过期率、经理排行） |
| `/admin/import` | **导入对账**（仅 ADMIN） |
| `/follow-up` | 重定向到 `/`（兼容旧链） |

侧栏：今日待办 · 全部业务 · 新建业务 · 业绩复盘 · 导入对账（ADMIN）· 修改密码。

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
web/src/
├── app/
│   ├── (dashboard)/          # 看板、列表、详情、导入
│   ├── login/
│   ├── settings/password/
│   ├── api/orders/
│   ├── api/admin/import/
│   └── api/auth/
├── components/ui/notion.tsx
├── components/orders/OrderDetailActions.tsx
├── lib/
│   ├── auth.ts / auth.config.ts
│   ├── order-rules.ts        # ★ 过期判定
│   ├── date-utils.ts         # ★ 办理日解析（当前年）
│   ├── permissions.ts
│   └── db.ts                 # Prisma + better-sqlite3 adapter
└── services/
    ├── scope.ts
    ├── orders.ts
    └── import/
        ├── personnel-importer.ts
        └── orders-importer.ts  # ★ Excel 补完成规则
```

数据：`unicom/data/*.xlsx`

---

## 11. 看板口径

| 指标 | 口径 |
|---|---|
| 总办理 | 可见范围内全部单 |
| 待激活 / 已完成 / 已过期 / 已退单 | 按 `status` |
| 即将过期 | 待激活且临近办理日+2（实现可再打磨） |
| 过期后补录完成 | `COMPLETED && wasEverExpired` |
| 经理排行 | 按开单人所属经理汇总（仅 ADMIN 首页） |

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
| P1 | 生产部署（可参考 Ali `deploy/`；库可换 PostgreSQL） |
| P1 | 每日 10:00 过期 cron |
| P2 | 列表导出、看板套餐/运营商分布图 |
| P2 | 退单沟通记录附件上传 |
| P2 | 侧栏当前页高亮；即将过期算法对齐 daysUntilExpire |
| P3 | 其它地区经理名单导入体验；同手机号历史提示 |
| P3 | 导入预览页（写入前确认过期/补完成条数） |

---

## 15. 快速定位问题

| 问题 | 先看 |
|---|---|
| 登录 / Session | `auth.ts`, `auth.config.ts`, `middleware.ts` |
| 过期对不对 | `order-rules.ts`, `date-utils.ts`, seed 年份 |
| Excel 补完成 | `orders-importer.ts` §8.4 |
| 权限越权 | `scope.ts`, `permissions.ts` |
| 导入失败 | `personnel-importer.ts`, `orders-importer.ts`, `/admin/import` |

---

*架构或产品约定变更时，请同步更新本文档与 `web/README.md`。*
