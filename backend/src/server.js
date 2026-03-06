import "dotenv/config";
import express from "express";
import cors from "cors";
import { count, desc, sql } from "drizzle-orm";
import { db } from "./db.js";
import { bookEmbeddings, books, userEvents } from "./schema.js";
import { recommendForUser } from "./recommender/llmRecommender.js";
import { createEmbedding, getModelConfig, rerankTextDocuments } from "./recommender/modelGateway.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await db.select({ id: books.id }).from(books).limit(1);
    res.json({ ok: true, db: "connected" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/books", async (_req, res) => {
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      description: books.description,
      category: books.category,
      rawGenres: books.rawGenres,
      averageRating: books.averageRating,
      ratingsCount: books.ratingsCount,
      coverUrl: books.coverUrl,
      smallCoverUrl: books.smallCoverUrl
    })
    .from(books)
    .orderBy(desc(books.ratingsCount), desc(books.createdAt))
    .limit(100);
  res.json(rows);
});

app.get("/api/model-effect", async (_req, res) => {
  try {
    const [bookStats] = await db
      .select({
        bookCount: count(books.id),
        categoryCount: sql`count(distinct ${books.category})`.mapWith(Number),
        averageBookRating: sql`round(avg(coalesce(${books.averageRating}, 0))::numeric, 2)`.mapWith(Number)
      })
      .from(books);
    const [embeddingStats] = await db.select({ embeddingCount: count(bookEmbeddings.bookId) }).from(bookEmbeddings);
    const [interactionStats] = await db
      .select({
        eventCount: count(userEvents.id),
        userCount: sql`count(distinct ${userEvents.userId})`.mapWith(Number)
      })
      .from(userEvents);

    const eventCountExpr = sql`count(${userEvents.id})`;
    const categoryCountExpr = sql`count(${books.id})`;

    const eventMix = await db
      .select({
        eventType: userEvents.eventType,
        count: eventCountExpr.mapWith(Number)
      })
      .from(userEvents)
      .groupBy(userEvents.eventType)
      .orderBy(desc(eventCountExpr));

    const categoryMix = await db
      .select({
        category: books.category,
        count: categoryCountExpr.mapWith(Number)
      })
      .from(books)
      .groupBy(books.category)
      .orderBy(desc(categoryCountExpr))
      .limit(6);

    const totalEvents = Number(interactionStats.eventCount || 0);
    const totalBooks = Number(bookStats.bookCount || 0);
    const totalEmbeddings = Number(embeddingStats.embeddingCount || 0);
    const totalUsers = Number(interactionStats.userCount || 0);

    const shares = Object.fromEntries(
      eventMix.map((item) => [
        item.eventType,
        totalEvents > 0 ? Number((item.count / totalEvents).toFixed(4)) : 0
      ])
    );

    return res.json({
      model: getModelConfig(),
      pipeline: {
        mode: totalEmbeddings > 0 ? "semantic-ready" : "fallback-mode",
        bookCount: totalBooks,
        categoryCount: Number(bookStats.categoryCount || 0),
        averageBookRating: Number(bookStats.averageBookRating || 0),
        embeddingCount: totalEmbeddings,
        embeddingCoverage: totalBooks > 0 ? Number((totalEmbeddings / totalBooks).toFixed(4)) : 0,
        eventCount: totalEvents,
        userCount: totalUsers,
        avgEventsPerUser: totalUsers > 0 ? Number((totalEvents / totalUsers).toFixed(1)) : 0
      },
      runtimeMetrics: {
        clickShare: shares.click || 0,
        borrowShare: shares.borrow || 0,
        favoriteShare: shares.favorite || 0
      },
      eventMix: eventMix.map((item) => ({
        eventType: item.eventType,
        count: item.count,
        share: totalEvents > 0 ? Number((item.count / totalEvents).toFixed(4)) : 0
      })),
      categoryMix: categoryMix.map((item) => ({
        category: item.category || "未分类",
        count: item.count
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/models", (_req, res) => {
  res.json(getModelConfig());
});

app.post("/api/models/embedding", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ error: "text 不能为空" });
    }

    const embedding = await createEmbedding(text);
    if (!embedding) {
      return res.status(503).json({ error: "当前 embedding provider 未配置可用的 API Key" });
    }

    return res.json({
      ...getModelConfig().embedding,
      embedding
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/models/rerank", async (req, res) => {
  try {
    const query = String(req.body?.query || "").trim();
    const topk = Number(req.body?.topk || 5);
    const rawDocuments = Array.isArray(req.body?.documents) ? req.body.documents : [];

    if (!query) {
      return res.status(400).json({ error: "query 不能为空" });
    }

    if (!rawDocuments.length) {
      return res.status(400).json({ error: "documents 不能为空" });
    }

    const documents = rawDocuments
      .map((document) => {
        if (typeof document === "string") {
          return document;
        }

        if (document && typeof document === "object") {
          return JSON.stringify(document);
        }

        return "";
      })
      .filter(Boolean);

    const items = await rerankTextDocuments(query, documents, topk);

    return res.json({
      ...getModelConfig().rerank,
      query,
      totalDocuments: documents.length,
      items
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/recommend", async (req, res) => {
  try {
    const { userId, topk = 10 } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId 不能为空" });
    }

    const result = await recommendForUser({ userId, topk: Number(topk) });
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
