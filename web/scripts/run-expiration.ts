import "dotenv/config";
import { runExpirationBatch } from "../src/services/import/orders-importer";
import { db } from "../src/lib/db";

runExpirationBatch()
  .then((count) => {
    console.log(`Marked ${count} orders as expired`);
  })
  .catch(console.error)
  .finally(() => db.$disconnect());
