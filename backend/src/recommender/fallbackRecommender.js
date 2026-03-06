import { desc, eq, notInArray, sql } from "drizzle-orm";

import { db } from "../db.js";
import { books, userEvents } from "../schema.js";

export async function getFallbackRecommendations(userId, limit = 10) {
  const avgRating = sql`coalesce(avg(${userEvents.rating}), 0)`;
  const ratingCount = sql`count(${userEvents.id})`;
  const excludedBooks = db.select({ bookId: userEvents.bookId }).from(userEvents).where(eq(userEvents.userId, userId));

  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      description: books.description,
      avgRating: avgRating.mapWith(Number),
      ratingCount: ratingCount.mapWith(Number)
    })
    .from(books)
    .leftJoin(userEvents, eq(userEvents.bookId, books.id))
    .where(notInArray(books.id, excludedBooks))
    .groupBy(books.id, books.title, books.author, books.description)
    .orderBy(desc(avgRating), desc(ratingCount))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    description: r.description,
    score: Number(r.avgRating)
  }));
}
