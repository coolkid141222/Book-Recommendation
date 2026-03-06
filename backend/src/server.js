import "dotenv/config";
import express from "express";
import cors from "cors";
import { desc } from "drizzle-orm";
import { db } from "./db.js";
import { books } from "./schema.js";
import { recommendForUser } from "./recommender/llmRecommender.js";

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
      description: books.description
    })
    .from(books)
    .orderBy(desc(books.createdAt))
    .limit(100);
  res.json(rows);
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
