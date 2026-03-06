import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import { pool } from "./db.js";

const schemaPath = path.resolve(process.cwd(), "./sql/schema.sql");

async function run() {
  const sql = await fs.readFile(schemaPath, "utf8");
  await pool.query(sql);
  console.log(`applied schema from ${schemaPath}`);
}

run()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
