import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import { parse } from "csv-parse/sync";
import { sql } from "drizzle-orm";

import { db, pool } from "./db.js";
import { books } from "./schema.js";

const BOOKS_CSV_PATH = path.resolve(process.cwd(), process.env.BOOKS_CSV_PATH || "../data/goodbooks/books.csv");
const IMPORT_BOOK_LIMIT = Number(process.env.IMPORT_BOOK_LIMIT || 300);
const BATCH_SIZE = 100;

function pickFirst(...values) {
  return values.find((value) => typeof value === "string" && value.trim() !== "") || null;
}

function parseListValue(value) {
  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (!(trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    return [trimmed];
  }

  const content = trimmed.slice(1, -1).trim();
  if (!content) {
    return [];
  }

  return content
    .replace(/^'/, "")
    .replace(/'$/, "")
    .split(/',\s*'/)
    .map((item) => item.replace(/\\'/g, "'").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeAuthor(value) {
  const authors = parseListValue(value);
  return authors.length ? authors.join(" / ") : pickFirst(value);
}

function resolveCategory(value) {
  const genres = parseListValue(value).map((genre) => genre.toLowerCase());

  if (genres.some((genre) => genre.includes("science-fiction") || genre.includes("dystopia"))) {
    return "科幻";
  }

  if (genres.some((genre) => genre.includes("fantasy") || genre.includes("paranormal") || genre.includes("magic"))) {
    return "奇幻";
  }

  if (genres.some((genre) => genre.includes("mystery") || genre.includes("thriller") || genre.includes("crime") || genre.includes("suspense"))) {
    return "推理";
  }

  if (genres.some((genre) => genre.includes("history") || genre.includes("historical") || genre.includes("biography"))) {
    return "历史";
  }

  if (
    genres.some(
      (genre) =>
        genre.includes("business") ||
        genre.includes("economics") ||
        genre.includes("finance") ||
        genre.includes("leadership") ||
        genre.includes("self-help") ||
        genre.includes("psychology")
    )
  ) {
    return "经管";
  }

  return "文学";
}

function normalizeRow(row) {
  const rawId = pickFirst(row.book_id, row.id, row.goodreads_book_id);
  const title = pickFirst(row.title);
  const author = normalizeAuthor(pickFirst(row.author, row.authors));
  const averageRating = Number(pickFirst(row.average_rating));
  const ratingsCount = Number(pickFirst(row.ratings_count, row.work_ratings_count));

  if (!rawId || !title || !author) {
    return null;
  }

  return {
    id: `gb_${String(rawId)}`,
    title,
    author,
    description: pickFirst(row.description),
    category: resolveCategory(row.genres),
    rawGenres: pickFirst(row.genres),
    averageRating: Number.isFinite(averageRating) ? averageRating.toFixed(2) : null,
    ratingsCount: Number.isFinite(ratingsCount) ? Math.round(ratingsCount) : null,
    coverUrl: pickFirst(row.image_url, row.cover_url),
    smallCoverUrl: pickFirst(row.small_image_url, row.small_cover_url)
  };
}

async function run() {
  await db.execute(sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS category TEXT`);
  await db.execute(sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS raw_genres TEXT`);
  await db.execute(sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2)`);
  await db.execute(sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS ratings_count INTEGER`);
  await db.execute(sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT`);
  await db.execute(sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS small_cover_url TEXT`);

  const raw = await fs.readFile(BOOKS_CSV_PATH, "utf8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true
  });

  const items = records.map(normalizeRow).filter(Boolean).slice(0, IMPORT_BOOK_LIMIT);

  for (let index = 0; index < items.length; index += BATCH_SIZE) {
    const batch = items.slice(index, index + BATCH_SIZE);
    for (const book of batch) {
      await db
        .insert(books)
        .values(book)
        .onConflictDoUpdate({
          target: books.id,
          set: {
            title: book.title,
            author: book.author,
            description: book.description,
            category: book.category,
            rawGenres: book.rawGenres,
            averageRating: book.averageRating,
            ratingsCount: book.ratingsCount,
            coverUrl: book.coverUrl,
            smallCoverUrl: book.smallCoverUrl
          }
        });
    }
  }

  console.log(`imported ${items.length} books from ${BOOKS_CSV_PATH}`);
}

run()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
