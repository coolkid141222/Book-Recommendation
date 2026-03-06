import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import { parse } from "csv-parse/sync";
import { sql } from "drizzle-orm";

import { db, pool } from "./db.js";
import { books, userEvents } from "./schema.js";

const RATINGS_CSV_PATH = path.resolve(process.cwd(), process.env.RATINGS_CSV_PATH || "../data/goodbooks/ratings.csv");
const IMPORT_RATING_LIMIT = Number(process.env.IMPORT_RATING_LIMIT || 30000);
const DATASET_USER_PREFIX = process.env.DATASET_USER_PREFIX || "gb_u_";
const RESET_DATASET_EVENTS = process.env.RESET_DATASET_EVENTS !== "false";
const INCLUDE_RATING_EVENTS = process.env.INCLUDE_RATING_EVENTS === "true";
const BATCH_SIZE = 500;

function buildImplicitEventSequence({ userId, bookId, rating, timestamp }) {
  const events = [
    {
      userId,
      bookId,
      eventType: "view",
      rating: null,
      createdAt: timestamp
    }
  ];

  if (rating >= 3) {
    events.push({
      userId,
      bookId,
      eventType: "click",
      rating: null,
      createdAt: new Date(timestamp.getTime() + 60_000)
    });
  }

  if (rating >= 4) {
    events.push({
      userId,
      bookId,
      eventType: "borrow",
      rating: null,
      createdAt: new Date(timestamp.getTime() + 120_000)
    });
  }

  if (rating >= 5) {
    events.push({
      userId,
      bookId,
      eventType: "favorite",
      rating: null,
      createdAt: new Date(timestamp.getTime() + 180_000)
    });
  }

  if (INCLUDE_RATING_EVENTS) {
    events.push({
      userId,
      bookId,
      eventType: "rating",
      rating: rating.toFixed(1),
      createdAt: new Date(timestamp.getTime() + 240_000)
    });
  }

  return events;
}

async function run() {
  const importedBooks = await db.select({ id: books.id }).from(books);
  const importedBookIds = new Set(importedBooks.map((book) => book.id));

  if (!importedBookIds.size) {
    throw new Error("books 表为空，请先执行书籍导入");
  }

  if (RESET_DATASET_EVENTS) {
    await db.delete(userEvents).where(sql`${userEvents.userId} LIKE ${`${DATASET_USER_PREFIX}%`}`);
  }

  const raw = await fs.readFile(RATINGS_CSV_PATH, "utf8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true
  });

  const values = [];
  let importedCount = 0;

  for (let index = 0; index < records.length; index += 1) {
    if (importedCount >= IMPORT_RATING_LIMIT) {
      break;
    }

    const row = records[index];
    const bookId = `gb_${row.book_id}`;
    if (!importedBookIds.has(bookId)) {
      continue;
    }

    const numericRating = Number(row.rating);
    if (!Number.isFinite(numericRating)) {
      continue;
    }

    const userId = `${DATASET_USER_PREFIX}${row.user_id}`;
    const timestamp = new Date(Date.UTC(2024, 0, 1, 0, importedCount % 24, importedCount % 60));
    values.push(...buildImplicitEventSequence({ userId, bookId, rating: numericRating, timestamp }));
    importedCount += 1;
  }

  for (let index = 0; index < values.length; index += BATCH_SIZE) {
    const batch = values.slice(index, index + BATCH_SIZE);
    await db.insert(userEvents).values(batch);
  }

  console.log(
    `imported ${importedCount} rating rows as ${values.length} implicit user events from ${RATINGS_CSV_PATH}${INCLUDE_RATING_EVENTS ? " (including rating events)" : ""}`
  );
}

run()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
