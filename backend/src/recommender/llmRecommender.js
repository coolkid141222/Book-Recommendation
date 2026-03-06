import OpenAI from "openai";
import { desc, eq, notInArray, sql } from "drizzle-orm";

import { db } from "../db.js";
import { bookEmbeddings, books, userEvents } from "../schema.js";
import { getFallbackRecommendations } from "./fallbackRecommender.js";

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const RERANK_MODEL = process.env.RERANK_MODEL || "gpt-4o-mini";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function getUserProfileText(userId) {
  const rows = await db
    .select({
      title: books.title,
      author: books.author,
      rating: userEvents.rating
    })
    .from(userEvents)
    .innerJoin(books, eq(books.id, userEvents.bookId))
    .where(eq(userEvents.userId, userId))
    .orderBy(desc(userEvents.createdAt))
    .limit(30);

  if (!rows.length) {
    return "新用户，偏好未知";
  }

  return rows
    .map((r) => `${r.title} by ${r.author}, rating=${r.rating}`)
    .join("; ");
}

async function embedText(text) {
  if (!client) {
    return null;
  }
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  });
  return res.data[0].embedding;
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
      sim: similarity.mapWith(Number)
    })
    .from(books)
    .innerJoin(bookEmbeddings, eq(bookEmbeddings.bookId, books.id))
    .where(notInArray(books.id, excludedBooks))
    .orderBy(distance)
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    description: r.description,
    score: Number(r.sim)
  }));
}

async function rerankWithLLM(profileText, candidates, topk) {
  if (!client || candidates.length === 0) {
    return candidates.slice(0, topk);
  }

  const prompt = `你是图书推荐排序器。\n用户画像: ${profileText}\n候选图书: ${JSON.stringify(
    candidates.map((c) => ({ id: c.id, title: c.title, author: c.author, description: c.description }))
  )}\n请返回JSON数组，按相关性降序，只包含id和reason，例如[{"id":"...","reason":"..."}]。`;

  const completion = await client.chat.completions.create({
    model: RERANK_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }]
  });

  let parsed;
  try {
    const content = completion.choices[0].message.content;
    parsed = JSON.parse(content);
  } catch {
    return candidates.slice(0, topk);
  }

  const ranked = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(ranked)) {
    return candidates.slice(0, topk);
  }

  const candidateMap = new Map(candidates.map((c) => [String(c.id), c]));
  const ordered = [];

  for (const item of ranked) {
    const id = String(item.id);
    if (candidateMap.has(id)) {
      ordered.push({ ...candidateMap.get(id), reason: item.reason || "LLM rerank" });
      candidateMap.delete(id);
    }
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
  const embedding = await embedText(profileText);
  const candidates = await getCandidatesByEmbedding(embedding, userId, Math.max(topk * 3, 20));
  const reranked = await rerankWithLLM(profileText, candidates, topk);

  return {
    userId,
    strategy: "embedding + llm rerank",
    totalCandidates: candidates.length,
    items: reranked.slice(0, topk)
  };
}
