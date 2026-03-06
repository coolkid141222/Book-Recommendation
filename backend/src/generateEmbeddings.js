import "dotenv/config";
import { sql } from "drizzle-orm";

import { db, pool } from "./db.js";
import { bookEmbeddings, books } from "./schema.js";
import { createEmbedding, getModelConfig } from "./recommender/modelGateway.js";

async function run() {
  const modelConfig = getModelConfig();
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
    const embedding = await createEmbedding(text);
    if (!embedding) {
      throw new Error("当前 embedding provider 未配置可用的 API Key");
    }

    await db
      .insert(bookEmbeddings)
      .values({
        bookId: book.id,
        embedding,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: bookEmbeddings.bookId,
        set: {
          embedding,
          updatedAt: sql`now()`
        }
      });
    console.log(`embedded ${book.id} via ${modelConfig.embedding.provider}:${modelConfig.embedding.model}`);
  }
}

run()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
