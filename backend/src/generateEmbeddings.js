import "dotenv/config";
import OpenAI from "openai";
import { sql } from "drizzle-orm";

import { db, pool } from "./db.js";
import { bookEmbeddings, books } from "./schema.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

async function run() {
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      description: books.description
    })
    .from(books);

  for (const book of rows) {
    const text = `${book.title} ${book.author} ${book.description || ""}`;
    const embedding = await client.embeddings.create({ model, input: text });
    await db
      .insert(bookEmbeddings)
      .values({
        bookId: book.id,
        embedding: embedding.data[0].embedding,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: bookEmbeddings.bookId,
        set: {
          embedding: embedding.data[0].embedding,
          updatedAt: sql`now()`
        }
      });
    console.log(`embedded ${book.id}`);
  }
}

run()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
