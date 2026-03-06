import { customType, integer, numeric, pgTable, text, timestamp, bigserial } from "drizzle-orm/pg-core";

const vector = customType({
  dataType(config) {
    return `vector(${config.dimensions})`;
  },
  toDriver(value) {
    return JSON.stringify(value);
  }
});

export const books = pgTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  description: text("description"),
  category: text("category"),
  rawGenres: text("raw_genres"),
  averageRating: numeric("average_rating", { precision: 3, scale: 2 }),
  ratingsCount: integer("ratings_count"),
  coverUrl: text("cover_url"),
  smallCoverUrl: text("small_cover_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const userEvents = pgTable("user_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: text("user_id").notNull(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  rating: numeric("rating", { precision: 2, scale: 1 }),
  eventType: text("event_type").default("view"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const bookEmbeddings = pgTable("book_embeddings", {
  bookId: text("book_id")
    .primaryKey()
    .references(() => books.id, { onDelete: "cascade" }),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
