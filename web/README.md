# 联通业务工作台

罗湖试点 · **订单运营台**：今日待办优先，业绩复盘二级，Excel 导入对账。

**完整约定与规则**见上级目录 [Leadspace.Unicom.md](../Leadspace.Unicom.md)（**最后更新 2026-07-19**）。

## 本地启动

```bash
cd web
npm install
cp .env.example .env
npm run db:push
npm run db:seed          # 导入 ../data/ 下罗湖 Excel
npm run dev              # http://localhost:1771
```

## 演示账号（密码均为 `123456`）

| 登录名 | 角色 |
|--------|------|
| `admin` | 管理员（可导入、看全量） |
| `linhao` / `dengxiuyun` / `longmin` | 经理（姓名拼音） |
| `zhoujie` 等 | 队员（姓名拼音；重名则 `xxx2`） |

经理、队员默认登录名 = **中文名拼音**，密码 `123456`。首登会要求改密。

## 数据文件

```
../data/
  罗湖联通业务员名单.xlsx
  业绩登记模版-上传数据系统.xlsx
```

管理员可在 **数据导入** 页一键重新导入，或上传新 Excel。

## 关键规则（摘要）

- **绩效** = 开单人（激活人另记）
- **过期** = 办理日 +2，D+3 日 10:00 批处理；`npm run expire:run`
- **过期后**可 Web 补录，或 Excel 改「已完成」再传升为完成
- 办理日 Excel 无年 → 按**当前年**解析（勿写死 2025）
- 组织：管理员 → 经理 → 队员（罗湖是经理 region，非公司租户）

## 技术栈

Next.js 16 · Prisma 7 · SQLite · NextAuth · Tailwind  

参考 Leadspace-Alipay **N7** 模块。
