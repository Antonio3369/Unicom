# 联通业务工作台

罗湖试点 · **订单运营台**：今日待办优先，业绩复盘二级，Excel 导入对账。

| | |
|---|---|
| 仓库 | [Antonio3369/Unicom](https://github.com/Antonio3369/Unicom) |
| 完整约定 | [Leadspace.Unicom.md](../Leadspace.Unicom.md) |
| **生产** | **https://uni.orblead.com** |
| 本地 | `docker compose up -d` → `npm run dev` → http://localhost:1771 |

## 本地启动

```bash
cd web
docker compose up -d   # PostgreSQL :5433（须 Docker Desktop Running）
npm run dev:setup      # 或分步：install → db:push → db:seed → dev
```

改 `schema.prisma` 后须 `npm run db:generate` 并**重启** dev。

## 演示账号（密码 `123456`，**仅本地/文档**，登录页不展示）

| 登录名 | 角色 |
|--------|------|
| `admin` | 管理员（导入、全量；不做 Web 开单） |
| 姓名拼音如 `linhao` | 经理 |
| 姓名拼音如 `zhoujie` | 队员 |

## 主要页面

| 路径 | 说明 |
|------|------|
| `/` | 今日待办 + **新建业务**按钮 |
| `/orders/new` | 新建（开单人默认本人） |
| `/orders/[id]` | 详情：修改 / **保存已激活** / 跟进 / 退单（卡片分区） |
| `/performance` | 业绩复盘 + **导出 Excel** |
| `/performance/staff/[id]` | 队员明细（可按状态筛）+ **导出 Excel** |
| `/admin/import` | 导入对账（ADMIN） |
| `/settings/password` | 改密（与主站同 **手机顶栏 Tab**） |

侧栏 / 手机顶栏：**新建业务**（经理/队员）、全部业务、业绩复盘、导入对账（ADMIN）、改密。长页面向下滚动后出现 **↑ 顶部**。

## 关键规则（摘要）

- **修改订单**：待激活/已过期/已完成可改（开单人不可改）；过期单 **原单补录**，不再「重新开单」
- **保存已激活**：须 1–3 张激活凭证；**退单**：须 1–3 张沟通记录
- **经理改队员单**：留修改记录；**导出**：业绩复盘页与队员下钻页，三角色各导各范围
- **绩效** = 开单人；**过期** = 办理日 +2，D+3 10:00 批处理

详见 [Leadspace.Unicom.md](../Leadspace.Unicom.md) §5–§7。

## 技术栈

Next.js 16 · Prisma 7 · **PostgreSQL**（本地 Docker 5433）· NextAuth · Tailwind

## 生产部署

见 [Leadspace.Unicom.md](../Leadspace.Unicom.md) §15 · `web/deploy/`
