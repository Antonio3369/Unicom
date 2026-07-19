# 联通业务工作台

罗湖试点 · **订单运营台**：今日待办优先，业绩复盘二级，Excel 导入对账。

| | |
|---|---|
| 仓库 | [Antonio3369/Unicom](https://github.com/Antonio3369/Unicom) |
| 完整约定 | 上级目录 [Leadspace.Unicom.md](../Leadspace.Unicom.md)（**最后更新 2026-07-19**） |
| 本地 | `cd web && npm run dev` → http://localhost:1771 |

## 本地启动

```bash
cd web
npm install
cp .env.example .env
npm run db:push
npm run db:seed          # 导入 ../data/ 下罗湖 Excel（文件需自备，不入库）
npm run dev              # http://localhost:1771
```

## 演示账号（密码均为 `123456`）

| 登录名 | 角色 |
|--------|------|
| `admin` | 管理员（可导入、看全量） |
| `linhao` / `dengxiuyun` / `longmin` | 经理（姓名拼音） |
| `zhoujie` 等 | 队员（姓名拼音；重名则 `xxx2`） |

经理、队员默认登录名 = **中文名拼音**，密码 `123456`。首登会要求改密。

## 主要页面

| 路径 | 说明 |
|------|------|
| `/` | 今日待办（四卡可点进队列） |
| `/orders` | 全部业务 |
| `/orders/new` · `/orders/[id]` | 新建 / 详情处理 |
| `/performance` | 业绩复盘 + 人员排名 |
| `/performance/staff/[id]` | 队员下钻 |
| `/performance/orders` | 复盘侧已完成/过期列表（从补录质量进入） |
| `/admin/import` | 导入对账（ADMIN） |

## 数据文件（本地）

```
../data/
  罗湖联通业务员名单.xlsx
  业绩登记模版-上传数据系统.xlsx
```

管理员可在 **导入对账** 页重新导入或上传新 Excel。样例表 **不进 Git**。

## 关键规则（摘要）

- **绩效** = 开单人（激活人另记）
- **过期** = 办理日 +2，D+3 日 10:00 批处理；`npm run expire:run`
- **过期后**可 Web 补录，或 Excel 改「已完成」再传升为完成
- 办理日 Excel 无年 → 按**当前年**解析（勿写死 2025）
- 组织：管理员 → 经理 → 队员（罗湖是经理 region，非公司租户）
- 复盘补录入口走 `/performance/orders`，不要链到侧栏「全部业务」

## 技术栈

Next.js 16 · Prisma 7 · SQLite · NextAuth · Tailwind  

工程上参考 Leadspace-Ali **N7**，产品形态是工作队列而非考核看板。
