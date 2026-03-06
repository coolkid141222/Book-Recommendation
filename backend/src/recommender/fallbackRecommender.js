import { desc, eq, notInArray, sql } from "drizzle-orm";

import { db } from "../db.js";
import { books, userEvents } from "../schema.js";

const EVENT_WEIGHT_SQL = sql`
  CASE
    WHEN ${userEvents.eventType} = 'borrow' THEN 4.0
    WHEN ${userEvents.eventType} = 'favorite' THEN 3.5
    WHEN ${userEvents.eventType} = 'add_to_shelf' THEN 3.0
    WHEN ${userEvents.eventType} = 'click' THEN 2.0
    WHEN ${userEvents.eventType} = 'view' THEN 1.0
    ELSE 0.5
  END
`;

export async function getFallbackRecommendations(userId, limit = 10) {
  const implicitScore = sql`coalesce(sum(${EVENT_WEIGHT_SQL}), 0)`;
  const interactionCount = sql`count(${userEvents.id})`;
  const popularityScore = sql`coalesce(${books.averageRating}, 0) + ln(greatest(coalesce(${books.ratingsCount}, 1), 1))`;
  const excludedBooks = db.select({ bookId: userEvents.bookId }).from(userEvents).where(eq(userEvents.userId, userId));

  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      description: books.description,
      category: books.category,
      averageRating: books.averageRating,
      ratingsCount: books.ratingsCount,
      implicitScore: implicitScore.mapWith(Number),
      interactionCount: interactionCount.mapWith(Number),
      popularityScore: popularityScore.mapWith(Number)
    })
    .from(books)
    .leftJoin(userEvents, eq(userEvents.bookId, books.id))
    .where(notInArray(books.id, excludedBooks))
    .groupBy(books.id, books.title, books.author, books.description, books.category, books.averageRating, books.ratingsCount)
    .orderBy(desc(implicitScore), desc(popularityScore), desc(interactionCount))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    description: row.description,
    category: row.category,
    score: Number(row.implicitScore || row.popularityScore || 0)
  }));
}
