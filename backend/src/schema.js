import { customType, numeric, pgTable, text, timestamp, bigserial } from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const userEvents = pgTable("user_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: text("user_id").notNull(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  rating: numeric("rating", { precision: 2, scale: 1 }),
  eventType: text("event_type").default("rating"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const bookEmbeddings = pgTable("book_embeddings", {
  bookId: text("book_id")
    .primaryKey()
    .references(() => books.id, { onDelete: "cascade" }),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
