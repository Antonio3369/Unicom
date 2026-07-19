# 联通业务工作台

罗湖试点 · **订单运营台**：今日待办优先，业绩复盘二级，Excel 导入对账。

| | |
|---|---|
| 仓库 | [Antonio3369/Unicom](https://github.com/Antonio3369/Unicom) |
| 完整约定 | 上级目录 [Leadspace.Unicom.md](../Leadspace.Unicom.md) |
| 本地 | `cd web && npm run dev` → 本机 http://localhost:1771；**手机**用终端里打印的 `http://192.168.x.x:1771`（同 WiFi，勿用 localhost） |

## 本地启动

**一键（推荐）**：

```bash
cd web
npm run dev:setup    # install → generate → push →（有 data 则 seed）→ dev
```

**分步**：

```bash
cd web
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed          # 需 web/data/*.xlsx；或管理员页上传
npm run dev              # 本机 localhost:1771；终端会打印手机用的局域网地址
```

改 `schema.prisma` 后须 `npm run db:generate` 并**重启** dev（Prisma 客户端会缓存）。

## 演示账号（密码均为 `123456`）

| 登录名 | 角色 |
|--------|------|
| `admin` | 管理员（可导入、看全量） |
| `linhao` / `dengxiuyun` / `longmin` | 经理（姓名拼音） |
| `zhoujie` 等 | 队员（姓名拼音；重名则 `xxx2`） |

经理、队员默认登录名 = **中文名全拼**，密码 `123456`。首登会要求改密。

## 主要页面

| 路径 | 说明 |
|------|------|
| `/` | 今日待办（四卡可点进队列） |
| `/orders` | 全部业务（待激活：未跟进优先排序 + 跟进筛选） |
| `/orders/new` · `/orders/[id]` | 新建 / 详情（经理开单可选本人或队员；重办带 `linkedVoidOrderId`） |
| `/performance` | 业绩复盘 + 人员排名 |
| `/performance/staff/[id]` | 队员下钻 |
| `/performance/orders` | 复盘侧已完成/过期列表（从补录质量进入） |
| `/admin/import` | 导入对账（ADMIN） |

## 数据文件（本地）

```
web/data/
  罗湖联通业务员名单.xlsx
  业绩登记模版-上传数据系统.xlsx
```

运营日常可在 **导入对账** 页直接上传 Excel，不必放 data 目录。`web/data/*.xlsx` **不进 Git**（见根目录 `.gitignore`）。

**手机调试**：同 WiFi 用终端打印的 `http://192.168.x.x:1771`；勿在 `.env` 写死 `AUTH_URL=http://localhost:...`。

## 关键规则（摘要）

- **经理也跑业务**：Web 开单/重办可选本人或队员；详情激活人含本人（队员榜仍只统计 SALES）
- **绩效** = 开单人（激活人另记）
- **过期** = 办理日 +2，D+3 日 10:00 批处理；`npm run expire:run`
- **过期后**可 Web 补录，或 Excel 改「已完成」再传升为完成
- 办理日 Excel 无年 → 按**当前年**解析（勿写死 2025）
- 组织：管理员 → 经理 → 队员（罗湖是经理 region，非公司租户）
- 复盘补录入口走 `/performance/orders`，不要链到侧栏「全部业务」

## 技术栈

Next.js 16 · Prisma 7 · SQLite · NextAuth · Tailwind  

工程上参考 Leadspace-Ali **N7**，产品形态是工作队列而非考核看板。
