import "dotenv/config";
import bcrypt from "bcryptjs";
import path from "path";
import { db } from "../src/lib/db";
import { importPersonnelFile } from "../src/services/import/personnel-importer";
import { importOrdersFile, runExpirationBatch } from "../src/services/import/orders-importer";

async function main() {
  const personnelFile =
    process.env.PERSONNEL_FILE ??
    path.join(__dirname, "../../data/罗湖联通业务员名单.xlsx");
  const ordersFile =
    process.env.ORDERS_FILE ??
    path.join(__dirname, "../../data/业绩登记模版-上传数据系统.xlsx");

  const adminHash = await bcrypt.hash("123456", 10);
  await db.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminHash,
      name: "管理员",
      role: "ADMIN",
      mustChangePassword: false,
    },
  });

  console.log("Importing personnel...", personnelFile);
  const p = await importPersonnelFile(personnelFile, "罗湖");
  console.log(p);

  console.log("Importing orders...", ordersFile);
  const o = await importOrdersFile(ordersFile);
  console.log(o);

  const expired = await runExpirationBatch();
  console.log("Expiration batch:", expired);

  const backends = [
    "佳足后台",
    "科华后台",
    "玉婷后台",
    "周洁后台",
    "宇飞后台",
    "光伦后台",
    "军豪后台",
    "杨利后台",
    "林副后台",
  ];
  for (const name of backends) {
    await db.backendDict.upsert({
      where: { name },
      update: { region: "罗湖" },
      create: { name, region: "罗湖" },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
