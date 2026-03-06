import { desc, eq, notInArray, sql } from "drizzle-orm";

import { db } from "../db.js";
import { bookEmbeddings, books, userEvents } from "../schema.js";
import { getFallbackRecommendations } from "./fallbackRecommender.js";
import { createEmbedding, getRecommendationStrategyLabel, rerankCandidates } from "./modelGateway.js";

const EVENT_WEIGHTS = {
  borrow: 4,
  favorite: 3.5,
  add_to_shelf: 3,
  click: 2,
  view: 1,
  rating: 0.5
};

const EVENT_LABELS = {
  borrow: "borrowed",
  favorite: "favorited",
  add_to_shelf: "saved",
  click: "clicked",
  view: "viewed",
  rating: "rated"
};

function getEventWeight(eventType) {
  return EVENT_WEIGHTS[eventType] ?? 0.5;
}

function getEventLabel(eventType) {
  return EVENT_LABELS[eventType] ?? "interacted with";
}

async function getUserProfileText(userId) {
  const rows = await db
    .select({
      title: books.title,
      author: books.author,
      category: books.category,
      eventType: userEvents.eventType
    })
    .from(userEvents)
    .innerJoin(books, eq(books.id, userEvents.bookId))
    .where(eq(userEvents.userId, userId))
    .orderBy(desc(userEvents.createdAt))
    .limit(40);

  if (!rows.length) {
    return "New user with no borrowing history. Prefer broadly appealing, high-quality books.";
  }

  const categoryScores = new Map();
  const authorScores = new Map();

  for (const row of rows) {
    const weight = getEventWeight(row.eventType);
    if (row.category) {
      categoryScores.set(row.category, (categoryScores.get(row.category) || 0) + weight);
    }
    authorScores.set(row.author, (authorScores.get(row.author) || 0) + weight);
  }

  const topCategories = Array.from(categoryScores.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([category]) => category);
  const topAuthors = Array.from(authorScores.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([author]) => author);
  const recentActions = rows
    .slice(0, 12)
    .map((row) => `${getEventLabel(row.eventType)} "${row.title}" by ${row.author}${row.category ? ` [${row.category}]` : ""}`)
    .join("; ");

  return [
    topCategories.length ? `Preferred categories: ${topCategories.join(", ")}.` : "",
    topAuthors.length ? `Frequently engaged authors: ${topAuthors.join(", ")}.` : "",
    `Recent implicit behaviors: ${recentActions}.`
  ]
    .filter(Boolean)
    .join(" ");
}

async function getCandidatesByEmbedding(embedding, userId, limit = 30) {
  if (!embedding) {
    return getFallbackRecommendations(userId, limit);
  }

  const embeddingLiteral = JSON.stringify(embedding);
  const similarity = sql`1 - (${bookEmbeddings.embedding} <=> ${embeddingLiteral}::vector)`;
  const distance = sql`${bookEmbeddings.embedding} <=> ${embeddingLiteral}::vector`;
  const excludedBooks = db.select({ bookId: userEvents.bookId }).from(userEvents).where(eq(userEvents.userId, userId));

  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      description: books.description,
      category: books.category,
      sim: similarity.mapWith(Number)
    })
    .from(books)
    .innerJoin(bookEmbeddings, eq(bookEmbeddings.bookId, books.id))
    .where(notInArray(books.id, excludedBooks))
    .orderBy(distance)
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    description: row.description,
    category: row.category,
    score: Number(row.sim)
  }));
}

async function rerankWithModel(profileText, candidates, topk) {
  if (candidates.length === 0) {
    return candidates.slice(0, topk);
  }

  const ranked = await rerankCandidates(profileText, candidates, topk);
  if (!Array.isArray(ranked)) {
    return candidates.slice(0, topk);
  }

  const candidateMap = new Map(candidates.map((candidate) => [String(candidate.id), candidate]));
  const ordered = [];

  for (const item of ranked) {
    const id = String(item.id);
    if (!candidateMap.has(id)) {
      continue;
    }

    ordered.push({
      ...candidateMap.get(id),
      reason: item.reason || "model rerank"
    });
    candidateMap.delete(id);

    if (ordered.length >= topk) {
      break;
    }
  }

  if (ordered.length < topk) {
    ordered.push(...Array.from(candidateMap.values()).slice(0, topk - ordered.length));
  }

  return ordered;
}

export async function recommendForUser({ userId, topk = 10 }) {
  const profileText = await getUserProfileText(userId);
  const embedding = await createEmbedding(profileText);
  const candidates = await getCandidatesByEmbedding(embedding, userId, Math.max(topk * 3, 20));
  const reranked = await rerankWithModel(profileText, candidates, topk);

  return {
    userId,
    strategy: getRecommendationStrategyLabel(),
    totalCandidates: candidates.length,
    items: reranked.slice(0, topk)
  };
}
